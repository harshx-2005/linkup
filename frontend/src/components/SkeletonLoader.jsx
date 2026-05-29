import React from 'react';

export const SidebarSkeleton = () => {
    return (
        <div className="w-full flex-1 overflow-y-auto space-y-3 p-4 animate-pulse">
            {/* Search Bar Skeleton */}
            <div className="h-10 bg-white/5 border border-white/5 rounded-xl mb-4"></div>
            
            {/* Meta AI Button Skeleton */}
            <div className="h-14 bg-white/5 border border-white/5 rounded-xl mb-6"></div>

            {/* Conversation Rows */}
            {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl border border-transparent">
                    <div className="w-12 h-12 rounded-full bg-white/10 shrink-0"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="h-4 bg-white/15 rounded-md w-24"></div>
                            <div className="h-3 bg-white/10 rounded-md w-12"></div>
                        </div>
                        <div className="h-3.5 bg-white/10 rounded-md w-3/4"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export const ChatSkeleton = () => {
    return (
        <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden animate-pulse">
            {/* Header Skeleton */}
            <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full bg-white/10"></div>
                    <div className="space-y-2">
                        <div className="h-4.5 bg-white/15 rounded-md w-32"></div>
                        <div className="h-3 bg-white/10 rounded-md w-16"></div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-9 h-9 rounded-full bg-white/5"></div>
                    <div className="w-9 h-9 rounded-full bg-white/5"></div>
                    <div className="w-9 h-9 rounded-full bg-white/5"></div>
                </div>
            </div>

            {/* Messages Area Skeleton */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Left Message */}
                <div className="flex items-end gap-3 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                    <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-white/10 rounded-md w-16"></div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 h-16 w-60"></div>
                    </div>
                </div>

                {/* Right Message */}
                <div className="flex items-end gap-3 max-w-[70%] ml-auto justify-end">
                    <div className="space-y-1.5 flex-1 flex flex-col items-end">
                        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/10 h-12 w-48"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                </div>

                {/* Left Message */}
                <div className="flex items-end gap-3 max-w-[70%]">
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                    <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-white/10 rounded-md w-20"></div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 h-20 w-80"></div>
                    </div>
                </div>

                {/* Right Message */}
                <div className="flex items-end gap-3 max-w-[70%] ml-auto justify-end">
                    <div className="space-y-1.5 flex-1 flex flex-col items-end">
                        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/10 h-16 w-56"></div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/10 shrink-0"></div>
                </div>
            </div>

            {/* Input Footer Skeleton */}
            <div className="p-4 border-t border-white/5 bg-black/10 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5"></div>
                <div className="w-10 h-10 rounded-full bg-white/5"></div>
                <div className="flex-1 h-11 bg-white/5 rounded-2xl"></div>
                <div className="w-11 h-11 rounded-full bg-blue-600/20"></div>
            </div>
        </div>
    );
};
