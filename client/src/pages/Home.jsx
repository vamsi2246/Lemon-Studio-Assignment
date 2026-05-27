import UploadBox from "../components/UploadBox";
import ChatBox from "../components/ChatBox";

const Home = () => {
  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-5xl font-bold mb-2">
        Enterprise Search Assistant
      </h1>

      <p className="text-zinc-400 mb-8">
        Multi-document AI powered semantic search system
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-1">
          <UploadBox />
        </div>

        <div className="lg:col-span-2">
          <ChatBox />
        </div>

      </div>
    </div>
  );
};

export default Home;