import MediaSearch from '../features/search/search';
import { ModalProvider } from '../lib/modalmanager';

function App() {
  return (
    <ModalProvider>
      <MediaSearch />
    </ModalProvider>
  );
}

export default App;
