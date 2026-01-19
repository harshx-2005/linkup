import { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [soundEnabled, setSoundEnabled] = useState(() => {
        return localStorage.getItem('linkup_sound') !== 'false';
    });

    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        return localStorage.getItem('linkup_notifications') !== 'false';
    });

    useEffect(() => {
        localStorage.setItem('linkup_sound', soundEnabled);
    }, [soundEnabled]);

    useEffect(() => {
        localStorage.setItem('linkup_notifications', notificationsEnabled);
    }, [notificationsEnabled]);

    const playMessageSound = () => {
        if (soundEnabled) {
            try {
                // Simple beep or load a file. For now, we'll try a standard notification sound if available or creating an Audio object
                // Using a hosted sound or local asset is best. I'll use a placeholder or generic URL.
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'); // Simple 'pop' sound
                audio.volume = 0.5;
                audio.play().catch(e => console.error("Audio play failed", e));
            } catch (err) {
                console.error("Sound error", err);
            }
        }
    };

    return (
        <SettingsContext.Provider value={{
            soundEnabled,
            setSoundEnabled,
            notificationsEnabled,
            setNotificationsEnabled,
            playMessageSound
        }}>
            {children}
        </SettingsContext.Provider>
    );
};
