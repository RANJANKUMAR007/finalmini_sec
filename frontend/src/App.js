import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import CreateSecret from "./pages/CreateSecret";
import ShareResult from "./pages/ShareResult";
import ViewSecret from "./pages/ViewSecret";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CreateSecret />} />
          <Route path="/share" element={<ShareResult />} />
          <Route path="/view/:secretId" element={<ViewSecret />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
