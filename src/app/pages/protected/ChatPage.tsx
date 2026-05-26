
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import AppIcon from '../../../components/shared/icons/AppIcon';
import ConfirmDialog from '../../../components/shared/dialogs/ConfirmDialog';
import ChatSessionFilters from '../../../features/chat/components/ChatSessionFilters';
import ChatSessionList from '../../../features/chat/components/ChatSessionList';
import ChatWorkspacePanel from '../../../features/chat/components/ChatWorkspacePanel';
import { usePersistentState } from '../../../lib/persistent-state';
import { services } from '../../../services';
import { useAuth } from '../../../auth';
import type {
  ChatMessage,
  Conversation,
  EntityId,
  SelectOption,
} from '../../../types/domain';

type SessionOrdering = '-last_message_at' | 'last_message_at' | '-created_at' | 'created_at';
type ChannelFilter = 'all' | Conversation['channel'];
type OperatorFilter = 'all' | 'active' | 'inactive';

const ALL_CHANNEL_VALUE = 'all' as const;
const PAGE_SIZE = 120;
const MESSAGE_PAGE_SIZE = 250;
const SESSIONS_POLL_INTERVAL_MS = 8000;
const MESSAGES_POLL_INTERVAL_MS = 6000;

function applySessionUpdate(
  sessions: Conversation[],
  nextSession: Conversation,
): Conversation[] {
  let matched = false;

  const updated = sessions.map((session) => {
    if (session.id !== nextSession.id) {
      return session;
    }

    matched = true;

    const resolvedOperatorNeeded =
      nextSession.operator_needed_defined === false || nextSession.operator_needed_defined == null
        ? session.operator_needed
        : nextSession.operator_needed;

    const merged: Conversation = {
      ...session,
      ...nextSession,
      operator_needed: resolvedOperatorNeeded,
      operator_needed_defined:
        session.operator_needed_defined === true || nextSession.operator_needed_defined === true,
    };

    // Some endpoints (e.g. mark-read) may omit preview fields; keep the existing ones
    // so list items don't temporarily show "no message/time".
    if (nextSession.last_message == null || nextSession.last_message === '') {
      merged.last_message = session.last_message;
    }
    if (nextSession.last_message_at == null || nextSession.last_message_at === '') {
      merged.last_message_at = session.last_message_at;
    }
    if (nextSession.last_message_payload == null) {
      merged.last_message_payload = session.last_message_payload;
    }

    return merged;
  });

  if (matched) {
    return updated;
  }

  return [nextSession, ...updated];
}

function matchesSessionFilters(
  session: Conversation,
  channelFilter: ChannelFilter,
  operatorFilter: OperatorFilter,
  search: string,
): boolean {
  const normalizedSearch = search.trim().toLowerCase();
  const channelMatches =
    channelFilter === ALL_CHANNEL_VALUE || session.channel === channelFilter;
  const operatorMatches =
    operatorFilter === 'all'
      ? true
      : operatorFilter === 'active'
        ? Boolean(session.is_operator_active)
        : !session.is_operator_active;
  const searchMatches =
    normalizedSearch.length === 0
      ? true
      : [
          session.client?.fullName,
          session.client?.phone,
          session.external_id,
          session.last_message,
          session.channel,
        ]
          .filter((value): value is string => Boolean(value))
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

  return channelMatches && operatorMatches && searchMatches;
}

function applyClientFilters(
  items: Conversation[],
  channelFilter: ChannelFilter,
  operatorFilter: OperatorFilter,
  search: string,
): Conversation[] {
  return items.filter((session) =>
    matchesSessionFilters(session, channelFilter, operatorFilter, search),
  );
}

function sortSessionsByOrdering(
  items: Conversation[],
  ordering: SessionOrdering,
): Conversation[] {
  const parseIso = (value: string | null) => {
    if (!value) {
      return null;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getKey = (session: Conversation) => {
    if (ordering === '-last_message_at' || ordering === 'last_message_at') {
      return parseIso(session.last_message_at);
    }

    return parseIso(session.created_at);
  };

  const isDesc = ordering.startsWith('-');

  return [...items].sort((left, right) => {
    const leftKey = getKey(left);
    const rightKey = getKey(right);

    if (leftKey == null && rightKey == null) {
      return String(left.id).localeCompare(String(right.id));
    }

    if (leftKey == null) {
      return 1;
    }

    if (rightKey == null) {
      return -1;
    }

    if (leftKey === rightKey) {
      return String(left.id).localeCompare(String(right.id));
    }

    return isDesc ? rightKey - leftKey : leftKey - rightKey;
  });
}

function ChatPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { hasPermission } = useAuth();
  const canManageConversations = hasPermission('can_manage_conversations');
  const copy = useMemo(
    () => ({
      orderingLatestMessage: t('chatPage.ordering.latestMessage'),
      orderingOldestMessage: t('chatPage.ordering.oldestMessage'),
      orderingNewestCreated: t('chatPage.ordering.newestCreated'),
      orderingOldestCreated: t('chatPage.ordering.oldestCreated'),
      sessionLoadError: t('chatPage.errors.sessionLoad'),
      messagesLoadError: t('chatPage.errors.messagesLoad'),
      messageSendError: t('chatPage.errors.messageSend'),
      sessionsTitle: t('chatPage.title'),
      countSuffix: t('chatPage.countSuffix'),
      closeSessionAria: t('chatPage.closeSessionAria'),
      aiPauseError: t('chatPage.errors.aiPause'),
      aiResumeError: t('chatPage.errors.aiResume'),
      followUpCreateError: t('chatPage.errors.followUpCreate'),
      followUpUpdateError: t('chatPage.errors.followUpUpdate'),
      followUpCancelError: t('chatPage.errors.followUpCancel'),
      sessionDeleteError: t('chatPage.errors.sessionDelete'),
      sessionDeleteConfirm: t('chatPage.confirmations.deleteSession'),
      followUpCancelConfirm: t('chatPage.confirmations.cancelFollowUp'),
      followUpCancelConfirmLabel: t('chatPage.confirmations.cancelFollowUpConfirmLabel'),
      deleteSession: t('chatPage.workspace.deleteSession'),
      deleteFollowUp: t('chatPage.workspace.followUp.cancel'),
      cancel: t('chatPage.workspace.cancel'),
    }),
    [t],
  );

  const [search, setSearch] = usePersistentState('chat:search', '');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>(ALL_CHANNEL_VALUE);
  const [operatorFilter, setOperatorFilter] = useState<OperatorFilter>('all');
  const [ordering, setOrdering] = useState<SessionOrdering>('-last_message_at');

  const [sessions, setSessions] = useState<Conversation[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<EntityId | null>(null);
  const [activeSession, setActiveSession] = useState<Conversation | null>(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [hasSessionsError, setHasSessionsError] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<Conversation | null>(
    null,
  );
  const [pendingCancelFollowUpSession, setPendingCancelFollowUpSession] =
    useState<Conversation | null>(null);
  const [isUpdatingAIState, setIsUpdatingAIState] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestedSessionId = useMemo(() => {
    const state = location.state as { sessionId?: unknown } | null;
    return typeof state?.sessionId === 'string' ? state.sessionId : null;
  }, [location.state]);

  const sessionCacheRef = useRef<Record<string, Conversation>>({});
  const activeSessionIdRef = useRef<EntityId | null>(null);
  const sessionsRequestRef = useRef(0);
  const sessionRequestRef = useRef(0);
  const messagesRequestRef = useRef(0);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const orderingOptions = useMemo<SelectOption[]>(
    () => [
      { value: '-last_message_at', label: copy.orderingLatestMessage },
      { value: 'last_message_at', label: copy.orderingOldestMessage },
      { value: '-created_at', label: copy.orderingNewestCreated },
      { value: 'created_at', label: copy.orderingOldestCreated },
    ],
    [copy],
  );

  const sessionQuery = useMemo(
    () => ({
      page: 1,
      pageSize: PAGE_SIZE,
      search: search.trim() || undefined,
      channel: channelFilter === ALL_CHANNEL_VALUE ? undefined : channelFilter,
      is_operator_active:
        operatorFilter === 'all'
          ? undefined
          : operatorFilter === 'active',
      ordering,
    }),
    [channelFilter, operatorFilter, ordering, search],
  );

  const applySessionListState = useCallback(
    (items: Conversation[]) =>
      sortSessionsByOrdering(
        applyClientFilters(items, channelFilter, operatorFilter, search),
        ordering,
      ),
    [channelFilter, operatorFilter, ordering, search],
  );

  const loadSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      const requestId = ++sessionsRequestRef.current;

      if (!options?.silent) {
        setIsSessionsLoading(true);
      }
      setHasSessionsError(false);

      try {
        const result = await services.chat.listSessions(sessionQuery);

        if (requestId !== sessionsRequestRef.current) {
          return;
        }

        for (const session of result.items) {
          sessionCacheRef.current[session.id] = session;
        }

        setSessions(applySessionListState(result.items));
      } catch {
        if (requestId !== sessionsRequestRef.current) {
          return;
        }

        setHasSessionsError(true);
      } finally {
        if (!options?.silent && requestId === sessionsRequestRef.current) {
          setIsSessionsLoading(false);
        }
      }
    },
    [applySessionListState, sessionQuery],
  );

  const loadActiveSession = useCallback(
    async (sessionId: EntityId, options?: { silent?: boolean }) => {
      const requestId = ++sessionRequestRef.current;

      if (!options?.silent) {
        setIsSessionLoading(true);
      }

      try {
        const sessionResponse = await services.chat.getSessionById(sessionId);
        if (
          requestId !== sessionRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        if (!sessionResponse) {
          setActiveSession(null);
          return;
        }

        const session = sessionResponse;
        let activeFollowUp = session.active_follow_up ?? null;
        try {
          activeFollowUp = await services.chat.getActiveFollowUp(sessionId);
        } catch {
          // Keep conversation loading resilient even if follow-up endpoint is unavailable.
        }
        const sessionWithFollowUp: Conversation = {
          ...session,
          active_follow_up: activeFollowUp
            ? {
                id: activeFollowUp.id,
                scheduled_for: activeFollowUp.scheduled_for,
                message: activeFollowUp.message,
                created_at: activeFollowUp.created_at,
                updated_at: activeFollowUp.updated_at,
              }
            : null,
        };
        sessionCacheRef.current[session.id] = sessionWithFollowUp;
        setActiveSession(sessionWithFollowUp);
        setSessions((current) =>
          applySessionListState(applySessionUpdate(current, sessionWithFollowUp)),
        );
      } catch {
        if (
          requestId !== sessionRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setActionError(copy.sessionLoadError);
      } finally {
        if (!options?.silent && requestId === sessionRequestRef.current) {
          setIsSessionLoading(false);
        }
      }
    },
    [applySessionListState, copy.sessionLoadError],
  );

  const markActiveSessionRead = useCallback(
    async (sessionId: EntityId) => {
      if (sessionId !== activeSessionIdRef.current) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.direction === 'incoming' &&
          message.sender_type === 'customer' &&
          !message.is_read
            ? { ...message, is_read: true }
            : message,
        ),
      );

      setSessions((current) =>
        applySessionListState(
          current.map((session) =>
            session.id === sessionId ? { ...session, unread_count: 0 } : session,
          ),
        ),
      );

      try {
        const updatedSession = await services.chat.markSessionRead(sessionId);
        if (!updatedSession || sessionId !== activeSessionIdRef.current) {
          return;
        }

        sessionCacheRef.current[updatedSession.id] = updatedSession;
        setActiveSession((current) => {
          if (!current || current.id !== sessionId) {
            return current;
          }

          return {
            ...current,
            ...updatedSession,
            last_message:
              updatedSession.last_message == null || updatedSession.last_message === ''
                ? current.last_message
                : updatedSession.last_message,
            last_message_at:
              updatedSession.last_message_at == null || updatedSession.last_message_at === ''
                ? current.last_message_at
                : updatedSession.last_message_at,
            last_message_payload:
              updatedSession.last_message_payload == null
                ? current.last_message_payload
                : updatedSession.last_message_payload,
          };
        });
        setSessions((current) =>
          applySessionListState(applySessionUpdate(current, updatedSession)),
        );
      } catch {
        // Preserve optimistic UI updates even if API sync fails.
      }
    },
    [applySessionListState],
  );

  const loadMessages = useCallback(
    async (sessionId: EntityId, options?: { silent?: boolean }) => {
      const requestId = ++messagesRequestRef.current;

      if (!options?.silent) {
        setIsMessagesLoading(true);
      }

      try {
        const result = await services.chat.listMessages({
          page: 1,
          pageSize: MESSAGE_PAGE_SIZE,
          session: sessionId,
          ordering: 'created_at',
        });

        if (
          requestId !== messagesRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setMessages(result.items);

        const hasUnreadIncoming = result.items.some(
          (message: ChatMessage) =>
            message.direction === 'incoming' &&
            message.sender_type === 'customer' &&
            !message.is_read,
        );
        if (hasUnreadIncoming) {
          void markActiveSessionRead(sessionId);
        }
      } catch {
        if (
          requestId !== messagesRequestRef.current ||
          sessionId !== activeSessionIdRef.current
        ) {
          return;
        }

        setActionError(copy.messagesLoadError);
      } finally {
        if (!options?.silent && requestId === messagesRequestRef.current) {
          setIsMessagesLoading(false);
        }
      }
    },
    [copy.messagesLoadError, markActiveSessionRead],
  );

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!requestedSessionId) {
      return;
    }

    setActiveSessionId(requestedSessionId);
  }, [requestedSessionId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadSessions({ silent: true });
    }, SESSIONS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadSessions]);

  useEffect(() => {
    if (!activeSessionId) {
      setActiveSession(null);
      setMessages([]);
      return;
    }

    setMessages([]);

    const cached = sessionCacheRef.current[activeSessionId];
    if (cached) {
      setActiveSession(cached);
    }

    void loadActiveSession(activeSessionId);
    void loadMessages(activeSessionId);
    void markActiveSessionRead(activeSessionId);
  }, [activeSessionId, loadActiveSession, loadMessages, markActiveSessionRead]);

  useEffect(() => {
    if (!activeSessionId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadActiveSession(activeSessionId, { silent: true });
      void loadMessages(activeSessionId, { silent: true });
    }, MESSAGES_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSessionId, loadActiveSession, loadMessages]);

  async function handleSendMessage(content: string) {
    if (!activeSessionId) {
      return;
    }

    setActionError(null);
    setIsSendingMessage(true);

    try {
      const createdMessage = await services.chat.sendMessage(activeSessionId, {
        content,
        metadata: {
          platform: activeSession?.channel ?? 'telegram',
          platform_user_id: activeSession?.external_id ?? String(activeSessionId),
        },
      });

      setMessages((current) => [...current, createdMessage]);

      setSessions((current) =>
        sortSessionsByOrdering(
          applyClientFilters(
            applySessionUpdate(current, {
            ...(current.find((session) => session.id === activeSessionId) ?? {
              id: activeSessionId,
              channel: 'manual',
              external_id: null,
              lead: null,
              client: null,
              assigned_operator: null,
              ai_paused_until: null,
              is_operator_active: false,
              operator_needed: false,
              last_message_at: null,
              state: 'open',
              last_message: null,
              created_at: createdMessage.created_at,
              updated_at: createdMessage.updated_at,
            }),
            last_message: createdMessage.content,
            last_message_payload: createdMessage,
            last_message_at: createdMessage.created_at,
            updated_at: createdMessage.updated_at,
          }),
            channelFilter,
            operatorFilter,
            search,
          ),
          ordering,
        ),
      );
      setActiveSession((current) =>
        current && current.id === activeSessionId
          ? {
              ...current,
              last_message: createdMessage.content,
              last_message_payload: createdMessage,
              last_message_at: createdMessage.created_at,
              updated_at: createdMessage.updated_at,
            }
          : current,
      );

      void loadMessages(activeSessionId, { silent: true });
    } catch {
      setActionError(copy.messageSendError);
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handlePauseAI(session: Conversation, pausedUntilIso: string) {
    setActionError(null);
    setIsUpdatingAIState(true);

    try {
      const updated = await services.chat.pauseSessionAI(session.id, pausedUntilIso);
      if (!updated) {
        return;
      }

      const pausedSession: Conversation = {
        ...updated,
        ai_paused_until: updated.ai_paused_until,
      };
      sessionCacheRef.current[pausedSession.id] = pausedSession;
      setActiveSession((current) =>
        current && current.id === pausedSession.id ? pausedSession : current,
      );
      setSessions((current) =>
        applySessionListState(applySessionUpdate(current, pausedSession)),
      );
    } catch {
      setActionError(copy.aiPauseError);
    } finally {
      setIsUpdatingAIState(false);
    }
  }

  async function handleResumeAI(session: Conversation) {
    setActionError(null);
    setIsUpdatingAIState(true);

    try {
      const updated = await services.chat.resumeSessionAI(session.id);
      if (!updated) {
        return;
      }

      sessionCacheRef.current[updated.id] = updated;
      setActiveSession((current) =>
        current && current.id === updated.id ? updated : current,
      );
      setSessions((current) =>
        applySessionListState(applySessionUpdate(current, updated)),
      );
    } catch {
      setActionError(copy.aiResumeError);
    } finally {
      setIsUpdatingAIState(false);
    }
  }

  function readErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object') {
      const messageValue = (error as { message?: unknown }).message;
      if (typeof messageValue === 'string' && messageValue.trim()) {
        return messageValue.trim();
      }

      const detailsValue = (error as { details?: unknown }).details;
      if (detailsValue && typeof detailsValue === 'object') {
        const detail = (detailsValue as Record<string, unknown>).detail;
        if (typeof detail === 'string' && detail.trim()) {
          return detail.trim();
        }
      }
    }

    return fallback;
  }

  async function refreshSessionAfterFollowUp(sessionId: EntityId) {
    await loadActiveSession(sessionId, { silent: true });
    await loadSessions({ silent: true });
  }

  async function handleCreateFollowUp(
    session: Conversation,
    input: { scheduled_for: string; message: string },
  ) {
    setActionError(null);
    setIsUpdatingFollowUp(true);
    try {
      await services.chat.createFollowUp(session.id, input);
      await refreshSessionAfterFollowUp(session.id);
    } catch (error) {
      setActionError(readErrorMessage(error, copy.followUpCreateError));
    } finally {
      setIsUpdatingFollowUp(false);
    }
  }

  async function handleUpdateFollowUp(
    session: Conversation,
    input: { scheduled_for: string; message: string },
  ) {
    setActionError(null);
    setIsUpdatingFollowUp(true);
    try {
      await services.chat.updateFollowUp(session.id, input);
      await refreshSessionAfterFollowUp(session.id);
    } catch (error) {
      setActionError(readErrorMessage(error, copy.followUpUpdateError));
    } finally {
      setIsUpdatingFollowUp(false);
    }
  }

  async function handleCancelFollowUp(session: Conversation): Promise<boolean> {
    setActionError(null);
    setIsUpdatingFollowUp(true);
    try {
      await services.chat.cancelFollowUp(session.id);
      await refreshSessionAfterFollowUp(session.id);
      return true;
    } catch (error) {
      setActionError(readErrorMessage(error, copy.followUpCancelError));
      return false;
    } finally {
      setIsUpdatingFollowUp(false);
    }
  }

  function requestCancelFollowUp(session: Conversation) {
    if (isUpdatingFollowUp) {
      return;
    }

    setPendingCancelFollowUpSession(session);
  }

  async function confirmCancelFollowUp() {
    const session = pendingCancelFollowUpSession;
    if (!session) {
      return;
    }

    const success = await handleCancelFollowUp(session);
    if (success) {
      setPendingCancelFollowUpSession(null);
    }
  }

  function handleDeleteSession(session: Conversation) {
    setPendingDeleteSession(session);
  }

  async function confirmDeleteSession() {
    const session = pendingDeleteSession;
    if (!session) {
      return;
    }

    setActionError(null);
    setIsDeletingSession(true);

    try {
      await services.chat.deleteSession(session.id);
      delete sessionCacheRef.current[session.id];
      setSessions((current) => current.filter((item) => item.id !== session.id));

      if (activeSessionIdRef.current === session.id) {
        setActiveSessionId(null);
        setActiveSession(null);
        setMessages([]);
      }
    } catch {
      setActionError(copy.sessionDeleteError);
    } finally {
      setIsDeletingSession(false);
      setPendingDeleteSession(null);
    }
  }

  const unreadBySessionId = useMemo(
    () =>
      Object.fromEntries(
        sessions.map((session) => [session.id, Math.max(0, session.unread_count ?? 0)]),
      ),
    [sessions],
  );

  const selectedSessionForModal = activeSessionId
    ? activeSession ?? sessions.find((session) => session.id === activeSessionId) ?? null
    : null;

  const workspaceSession = selectedSessionForModal;

  return (
    <>
      <div className="grid h-full min-h-0 gap-0 min-[1024px]:h-[calc(100dvh-15vh)] min-[1024px]:max-h-[860px] min-[1024px]:items-start min-[1024px]:gap-3 min-[1024px]:grid-cols-[430px_minmax(0,1fr)] min-[1380px]:grid-cols-[470px_minmax(0,1fr)]">
        <section
          className={[
            'h-full min-h-0',
            selectedSessionForModal ? 'max-[1023px]:hidden' : '',
          ].join(' ')}
          aria-hidden={Boolean(selectedSessionForModal)}
        >
          <div className="grid h-full min-h-0 grid-rows-[auto_auto_1fr] gap-3 rounded-none bg-background-default p-3 min-[1024px]:rounded-xl min-[1024px]:bg-surface-card min-[1024px]:p-5 min-[1024px]:shadow-sm min-[1024px]:ring-1 min-[1024px]:ring-border-soft/40">
            <div className="flex items-center justify-between gap-2">
              <h2 className="m-0 text-[1rem] font-semibold text-text-primary">
                {copy.sessionsTitle}
              </h2>
              <span className="text-[12px] font-medium text-text-muted">
                {sessions.length} {copy.countSuffix}
              </span>
            </div>

            <ChatSessionFilters
              search={search}
              channelFilter={channelFilter}
              operatorFilter={operatorFilter}
              ordering={ordering}
              orderingOptions={orderingOptions}
              disabled={isSessionsLoading}
              onSearchChange={setSearch}
              onChannelChange={setChannelFilter}
              onOperatorFilterChange={setOperatorFilter}
              onOrderingChange={(value) => setOrdering(value as SessionOrdering)}
            />

            <div className="min-h-0 overflow-y-auto overflow-x-hidden pr-1">
              <ChatSessionList
                sessions={sessions}
                selectedSessionId={activeSessionId}
                unreadBySessionId={unreadBySessionId}
                isLoading={isSessionsLoading}
                hasError={hasSessionsError}
                onSelectSession={setActiveSessionId}
              />
            </div>
          </div>
        </section>

        <section className="hidden h-full min-h-0 min-[1024px]:block">
          <div className="h-full min-h-0 rounded-xl bg-surface-card p-5 shadow-sm ring-1 ring-border-soft/40">
            <ChatWorkspacePanel
              session={workspaceSession}
              messages={messages}
              isLoading={isMessagesLoading || isSessionLoading}
              isSending={isSendingMessage}
              isDeletingSession={isDeletingSession}
              isUpdatingAIState={isUpdatingAIState}
              isUpdatingFollowUp={isUpdatingFollowUp}
              canManageFollowUp={canManageConversations}
              onSendMessage={handleSendMessage}
              onRequestDeleteSession={handleDeleteSession}
              onPauseAI={handlePauseAI}
              onResumeAI={handleResumeAI}
              onCreateFollowUp={handleCreateFollowUp}
              onUpdateFollowUp={handleUpdateFollowUp}
              onRequestCancelFollowUp={requestCancelFollowUp}
            />
          </div>
        </section>
      </div>

      {selectedSessionForModal ? (
        <div className="fixed inset-0 z-[140] bg-background-default min-[1024px]:hidden">
          <button
            type="button"
            className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-card/90 text-text-primary ring-1 ring-border-soft/60 transition duration-fast hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            onClick={() => setActiveSessionId(null)}
            aria-label={copy.closeSessionAria}
          >
            <AppIcon name="close" className="h-4.5 w-4.5" aria-hidden="true" />
          </button>
          <div className="h-full min-h-0">
            <ChatWorkspacePanel
              session={selectedSessionForModal}
              messages={messages}
              isLoading={isMessagesLoading || isSessionLoading}
              isSending={isSendingMessage}
              isDeletingSession={isDeletingSession}
              isUpdatingAIState={isUpdatingAIState}
              isUpdatingFollowUp={isUpdatingFollowUp}
              canManageFollowUp={canManageConversations}
              onSendMessage={handleSendMessage}
              onRequestDeleteSession={handleDeleteSession}
              onPauseAI={handlePauseAI}
              onResumeAI={handleResumeAI}
              onCreateFollowUp={handleCreateFollowUp}
              onUpdateFollowUp={handleUpdateFollowUp}
              onRequestCancelFollowUp={requestCancelFollowUp}
            />
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="fixed bottom-4 right-4 z-[230] max-w-[320px] rounded-lg bg-danger-bg px-3 py-2 text-sm font-medium text-danger shadow-lg ring-1 ring-danger/25">
          {actionError}
        </div>
      ) : null}

      {pendingDeleteSession ? (
        <ConfirmDialog
          eyebrow={copy.deleteSession}
          title={copy.deleteSession}
          description={copy.sessionDeleteConfirm}
          cancelLabel={copy.cancel}
          confirmLabel={copy.deleteSession}
          isBusy={isDeletingSession}
          confirmTone="danger"
          onCancel={() => {
            if (!isDeletingSession) {
              setPendingDeleteSession(null);
            }
          }}
          onConfirm={() => {
            void confirmDeleteSession();
          }}
          ariaLabel={copy.deleteSession}
        />
      ) : null}

      {pendingCancelFollowUpSession ? (
        <ConfirmDialog
          eyebrow={copy.deleteFollowUp}
          title={copy.deleteFollowUp}
          description={copy.followUpCancelConfirm}
          cancelLabel={copy.cancel}
          confirmLabel={copy.followUpCancelConfirmLabel}
          isBusy={isUpdatingFollowUp}
          confirmTone="danger"
          onCancel={() => {
            if (!isUpdatingFollowUp) {
              setPendingCancelFollowUpSession(null);
            }
          }}
          onConfirm={() => {
            void confirmCancelFollowUp();
          }}
          ariaLabel={copy.deleteFollowUp}
        />
      ) : null}
    </>
  );
}

export default ChatPage;



