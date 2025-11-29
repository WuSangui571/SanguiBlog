import React, {createContext, useContext} from 'react';

export const LayoutOffsetContext = createContext({
    headerHeight: 80,
    navHeight: 80,
    emergencyHeight: 0,
});

export const useLayoutOffsets = () => useContext(LayoutOffsetContext);
