export default function PopupMenu({ email, onLogout }) {
  return (
    <div className="absolute right-0 mt-2 w-56 origin-top-right animate-in fade-in zoom-in bg-white dark:bg-slate-800 shadow-lg rounded-xl z-10 border border-slate-200 dark:border-slate-700">
      <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">{email}</div>
      <button
        onClick={onLogout}
        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-b-xl transition-colors"
      >
        Logout
      </button>
    </div>
  );
}