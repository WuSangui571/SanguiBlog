import React, { useEffect, useState } from 'react';const ClickRipple = () => {
    const [ripples, setRipples] = useState([]);
    useEffect(() => {
        const handleClick = (e) => {
            const id = Date.now();
            setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }]);
            setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 1000);
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
            {ripples.map(ripple => (
                <motion.div
                    key={ripple.id}
                    initial={{ width: 0, height: 0, opacity: 0.8, borderWidth: 5 }}
                    animate={{ width: 100, height: 100, opacity: 0, borderWidth: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        x: '-50%',
                        y: '-50%',
                        borderColor: ['#6366F1', '#FF0080', '#FFD700'][Math.floor(Math.random() * 3)]
                    }}
                    className="absolute rounded-full border-solid border-black"
                />
            ))}
        </div>
    );
};

// --- 3. 前台视图组件 (保持不变) ---
export default ClickRipple;
