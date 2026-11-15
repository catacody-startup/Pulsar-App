/** The pages of the app and their paths: `/` crew, `/crew/<id>` one crew member, `/sign-in`, `/about`. */
export type Route =
  | { page: 'crew' }
  | { page: 'member'; crewId: string }
  | { page: 'signIn' }
  | { page: 'about' }
  | { page: 'notFound' };

export function parseRoute(path: string, crewIds: readonly string[]): Route {
  const clean = path.replace(/\/+$/, '') || '/';
  if (clean === '/') return { page: 'crew' };
  if (clean === '/about') return { page: 'about' };
  if (clean === '/sign-in') return { page: 'signIn' };
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
    case 'signIn':
      return '/sign-in';
    case 'member':
      return `/crew/${route.crewId}`;
  }
}
