describe('Supabase Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw if SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    expect(() => require('./supabaseClient')).toThrow(
      'Las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas'
    );
  });

  it('should throw if SUPABASE_ANON_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.SUPABASE_ANON_KEY;
    expect(() => require('./supabaseClient')).toThrow(
      'Las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas'
    );
  });

  it('should export a supabase client when env vars are set', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    const client = require('./supabaseClient');
    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });
});

describe('Supabase Admin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw if SUPABASE_URL is missing', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    expect(() => require('./supabaseAdmin')).toThrow(
      'Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas'
    );
  });

  it('should throw if SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => require('./supabaseAdmin')).toThrow(
      'Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas'
    );
  });

  it('should export a supabase admin client when env vars are set', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    const admin = require('./supabaseAdmin');
    expect(admin).toBeDefined();
    expect(typeof admin.from).toBe('function');
  });
});
