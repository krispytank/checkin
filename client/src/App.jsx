import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ConfigProvider } from './contexts/ConfigContext.jsx';
import AppRouter from './router/AppRouter.jsx';
import Toaster from './components/Toaster.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppRouter />
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
