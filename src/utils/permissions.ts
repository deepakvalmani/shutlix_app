export const canAccess = (user: any | null, allowedRoles?: string[]): boolean => {
  if (!user || !user.role) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  
  // Superadmins always have access
  if (user.role === 'superadmin') return true;
  
  return allowedRoles.includes(user.role);
};

export const getDashboardPath = (role: string): string => {
  const paths: Record<string, string> = {
    driver: '/driver',
    admin: '/admin',
    superadmin: '/superadmin',
    student: '/student'
  };
  return paths[role] || '/student';
};
