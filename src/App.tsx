import { RouterProvider } from 'react-router-dom';
import { appRouter } from './app/routes/app-router';
import { AuthProvider } from './auth';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={appRouter} />
    </AuthProvider>
  );
}

export default App;

