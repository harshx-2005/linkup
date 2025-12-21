import { useEffect, useRef } from 'react';

const UserProfileModal = ({ user, onClose }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div
                ref={modalRef}
                className="bg-gray-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-800 animate-fade-in-up"
            >
                <div className="bg-gray-800 p-6 flex flex-col items-center relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>

                    <div className="w-24 h-24 rounded-full overflow-hidden shadow-lg mb-4 ring-4 ring-gray-700/50">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-linear-to-br from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                                {user.name[0].toUpperCase()}
                            </div>
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                </div>

                <div className="p-6">
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">About</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        {user.bio || "No bio available"}
                    </p>
                </div>

                <div className="p-4 bg-gray-950 flex justify-center">
                    <button onClick={onClose} className="text-blue-500 hover:text-blue-400 text-sm font-medium">
                        Close Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
