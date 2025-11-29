import React, {createContext, useContext} from 'react';

export const PermissionContext = createContext({
    permissions: [],
    loading: true,
    error: '',
    hasPermission: () => false,
});

export const usePermissionContext = () => useContext(PermissionContext);
