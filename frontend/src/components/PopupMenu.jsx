export default function PopupMenu({ email, onLogout }) {
    return (
      <div className="absolute right-0 mt-2 w-48 bg-white shadow-md rounded-lg z-10">
        <div className="px-4 py-2 text-sm text-gray-700 border-b">{email}</div>
        <button
          onClick={onLogout}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    );
  }