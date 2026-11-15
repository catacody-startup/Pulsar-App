/** The pages of the app and their paths: `/` crew, `/crew/<id>` one crew member, `/about`. */
export type Route = { page: 'crew' } | { page: 'member'; crewId: string } | { page: 'about' } | { page: 'notFound' };

export function parseRoute(path: string, crewIds: readonly string[]): Route {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'crew' };
  if (clean === '/about') return { page: 'about' };
  const member = /^\/crew\/([a-z0-9-]+)$/.exec(clean);
  if (member && crewIds.includes(member[1]!)) return { page: 'member', crewId: member[1]! };
  return { page: 'notFound' };
}

export function routePath(route: Route): string {
  switch (route.page) {
    case 'crew':
    case 'notFound':
      return '/';
    case 'about':
      return '/about';
    case 'member':
      return `/crew/${route.crewId}`;
  }
}
