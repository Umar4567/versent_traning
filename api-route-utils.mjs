export const normalizeApiPathname = (pathname = '/') => {
  if (!pathname || pathname === '/') {
    return pathname || '/';
  }

  if (pathname.startsWith('/api/')) {
    return pathname.replace(/^\/api/, '');
  }

  return pathname;
};
