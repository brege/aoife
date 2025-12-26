import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MediaSearch from '../features/search/search';
import { ModalProvider } from '../lib/modalmanager';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>
        <MediaSearch />
      </ModalProvider>
    </QueryClientProvider>
  );
}

export default App;
