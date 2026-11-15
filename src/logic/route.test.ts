import { describe, expect, it } from 'vitest';
import { parseRoute, routePath } from './route';

const ids = ['lucia', 'kenji'];

describe('routes', () => {
  it('reads the page from the path', () => {
    expect(parseRoute('/', ids)).toEqual({ page: 'crew' });
    expect(parseRoute('/about/', ids)).toEqual({ page: 'about' });
    expect(parseRoute('/crew/kenji', ids)).toEqual({ page: 'member', crewId: 'kenji' });
    expect(parseRoute('/crew/nobody', ids)).toEqual({ page: 'notFound' });
    expect(parseRoute('/elsewhere', ids)).toEqual({ page: 'notFound' });
  });

  it('round-trips', () => {
    for (const path of ['/', '/about', '/sign-in', '/crew/lucia']) expect(routePath(parseRoute(path, ids))).toBe(path);
  });
});
