import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
    <h1 className="text-4xl mb-4">Page Not Found</h1>
    <Link to="/" className="text-blue-400 hover:underline">
      Go back home
    </Link>
  </div>
);

export default NotFound;
