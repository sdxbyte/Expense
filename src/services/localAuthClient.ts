import { User } from '@supabase/supabase-js';
import { hashPassword } from '../utils/crypto';

const LOCAL_USERS_KEY = 'ledger_local_registered_users';
const LOCAL_SESSION_KEY = 'ledger_local_current_session';

type AuthListener = (event: string, session: { user: User } | null) => void;
const authListeners: Set<AuthListener> = new Set();

function getLocalUsers(): Record<string, { user: User; passwordHash: string }> {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalUsers(users: Record<string, { user: User; passwordHash: string }>) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

export function getLocalSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSessionUser(user: User | null) {
  if (user) {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  }
}

function generateSecureSessionToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function notifyListeners(event: string, user: User | null) {
  const session = user ? ({ user, access_token: generateSecureSessionToken() } as any) : null;
  authListeners.forEach((listener) => listener(event, session));
}

let localAuthClientInstance: any = null;

export function createLocalAuthClient(): any {
  if (localAuthClientInstance) return localAuthClientInstance;

  localAuthClientInstance = {
    auth: {
      async getSession() {
        const user = getLocalSessionUser();
        return {
          data: {
            session: user ? { user, access_token: generateSecureSessionToken() } : null,
          },
          error: null,
        };
      },
      async getUser() {
        const user = getLocalSessionUser();
        return {
          data: { user },
          error: null,
        };
      },
      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: { phone?: string } } }) {
        const trimmedEmail = email.trim().toLowerCase();
        const users = getLocalUsers();

        if (users[trimmedEmail]) {
          return {
            data: { user: null, session: null },
            error: { message: 'An account with this email address already exists. Please sign in instead.' },
          };
        }

        const phone = options?.data?.phone || '';
        const hashed = await hashPassword(password);
        const newUser: User = {
          id: 'usr_' + Math.random().toString(36).substring(2, 11),
          email: trimmedEmail,
          user_metadata: { phone },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          role: 'authenticated',
        } as unknown as User;

        users[trimmedEmail] = { user: newUser, passwordHash: hashed };
        saveLocalUsers(users);
        setLocalSessionUser(newUser);
        notifyListeners('SIGNED_IN', newUser);

        return {
          data: {
            user: newUser,
            session: { user: newUser, access_token: generateSecureSessionToken() },
          },
          error: null,
        };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const trimmedEmail = email.trim().toLowerCase();
        const users = getLocalUsers();
        const account = users[trimmedEmail];

        if (!account) {
          return {
            data: { user: null, session: null },
            error: { message: 'No account found with this email. Please sign up to create your account.' },
          };
        }

        const hashedInput = await hashPassword(password);
        // Compare hashed password or check legacy plaintext if exists
        const matches = account.passwordHash === hashedInput || account.passwordHash === password;

        if (!matches) {
          return {
            data: { user: null, session: null },
            error: { message: 'Incorrect password. Please verify and try again.' },
          };
        }

        // Upgrade legacy plaintext password hash to SHA-256 hash automatically if needed
        if (account.passwordHash === password) {
          account.passwordHash = hashedInput;
          users[trimmedEmail] = account;
          saveLocalUsers(users);
        }

        setLocalSessionUser(account.user);
        notifyListeners('SIGNED_IN', account.user);

        return {
          data: {
            user: account.user,
            session: { user: account.user, access_token: generateSecureSessionToken() },
          },
          error: null,
        };
      },
      async signOut() {
        setLocalSessionUser(null);
        notifyListeners('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange(callback: AuthListener) {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(callback);
              },
            },
          },
        };
      },
    },
    from(_table: string) {
      const chainable: any = {
        select: () => chainable,
        upsert: () => Promise.resolve({ data: null, error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => chainable,
        delete: () => chainable,
        eq: () => chainable,
        order: () => chainable,
        limit: () => Promise.resolve({ data: [], error: null }),
        then: (resolve: any) => resolve({ data: [], error: null }),
      };
      return chainable;
    },
  };

  return localAuthClientInstance;
}
