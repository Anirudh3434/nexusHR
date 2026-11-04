const fs = require('fs');
const path = require('path');

// 1. app/api/auth/login/route.ts
const loginRoutePath = path.join(__dirname, '..', 'app', 'api', 'auth', 'login', 'route.ts');
let loginRoute = fs.readFileSync(loginRoutePath, 'utf8');

loginRoute = loginRoute.replace(
  'const { email, password } = await req.json();',
  'const { email, password, companyId: expectedCompanyId, candidateOnly, superAdminOnly } = await req.json();'
);

loginRoute = loginRoute.replace(
  /if \(!user\) \{(\r?\n)\s*\/\/ Platform administrators/,
  (match, p1) => `if (!user) {${p1}      if (expectedCompanyId || candidateOnly) {${p1}        return NextResponse.json({ message: "This account does not belong to this company's portal." }, { status: 403 });${p1}      }${p1}      // Platform administrators`
);

const oldMatchBlock = /if \(!isMatch\) \{(\r?\n)\s*return NextResponse\.json\(\{ message: 'Invalid credentials' \}, \{ status: 401 \}\);(\r?\n)\s*\}/;

loginRoute = loginRoute.replace(oldMatchBlock, (match, p1, p2) => {
  return `if (superAdminOnly) {${p1}      return NextResponse.json({ message: 'This sign-in is reserved for platform super admins.' }, { status: 403 });${p1}    }${p1}${p1}    if (!isMatch) {${p1}      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });${p1}    }${p1}${p1}    if (expectedCompanyId) {${p1}      if (!user.companyId || user.companyId.toString() !== expectedCompanyId.toString()) {${p1}        return NextResponse.json({ message: "This account does not belong to this company's portal." }, { status: 403 });${p1}      }${p1}    }${p1}${p1}    if (candidateOnly && !user.isCandidate) {${p1}      return NextResponse.json({ message: 'This account is not a candidate account.' }, { status: 403 });${p1}    }`;
});

fs.writeFileSync(loginRoutePath, loginRoute, 'utf8');
console.log('1. Updated app/api/auth/login/route.ts');

// 2. context/AuthContext.tsx
const authContextPath = path.join(__dirname, '..', 'context', 'AuthContext.tsx');
let authContext = fs.readFileSync(authContextPath, 'utf8');

if (!authContext.includes('export interface LoginOptions')) {
  authContext = authContext.replace(
    'interface AuthContextProps {',
    `export interface LoginOptions {\n  companyId?: string;\n  candidateOnly?: boolean;\n  superAdminOnly?: boolean;\n}\n\ninterface AuthContextProps {`
  );

  authContext = authContext.replace(
    'login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;',
    'login: (email: string, password: string, options?: LoginOptions) => Promise<{ success: boolean; error?: string; user?: User }>;'
  );

  authContext = authContext.replace(
    'const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> => {',
    'const login = useCallback(async (email: string, password: string, options?: LoginOptions): Promise<{ success: boolean; error?: string; user?: User }> => {'
  );

  authContext = authContext.replace(
    "body: JSON.stringify({ email, password }),",
    `body: JSON.stringify({\n          email,\n          password,\n          companyId: options?.companyId,\n          candidateOnly: options?.candidateOnly,\n          superAdminOnly: options?.superAdminOnly,\n        }),`
  );

  fs.writeFileSync(authContextPath, authContext, 'utf8');
  console.log('2. Updated context/AuthContext.tsx');
}

// 3. app/[companySlug]/page.tsx
const companySlugPath = path.join(__dirname, '..', 'app', '[companySlug]', 'page.tsx');
let companySlug = fs.readFileSync(companySlugPath, 'utf8');

companySlug = companySlug.replace(
  'const { login } = useAuth();',
  'const { login, logout } = useAuth();'
);

companySlug = companySlug.replace(
  'const result = await login(email, password);',
  'const result = await login(email, password, { companyId: company?.id });'
);

companySlug = companySlug.replace(
  'addToast({ type: "error", title: "Wrong Company", description: "This account does not belong to this company\'s portal." });',
  'logout();\n        addToast({ type: "error", title: "Wrong Company", description: "This account does not belong to this company\'s portal." });'
);

companySlug = companySlug.replace(
  'onClick={() => {\n                  if (typeof document !== "undefined") {',
  'onClick={() => {\n                  logout();\n                  if (typeof document !== "undefined") {'
).replace(
  'onClick={() => {\r\n                  if (typeof document !== "undefined") {',
  'onClick={() => {\r\n                  logout();\r\n                  if (typeof document !== "undefined") {'
);

fs.writeFileSync(companySlugPath, companySlug, 'utf8');
console.log('3. Updated app/[companySlug]/page.tsx');

// 4. app/(auth)/login/page.tsx
const loginPagePath = path.join(__dirname, '..', 'app', '(auth)', 'login', 'page.tsx');
let loginPage = fs.readFileSync(loginPagePath, 'utf8');

if (!loginPage.includes('const { logout } = useAuth();')) {
  loginPage = loginPage.replace(
    'const { addToast } = useToast();',
    'const { addToast } = useToast();\n  const { logout } = useAuth();'
  );

  loginPage = loginPage.replace(
    "if (typeof window !== \"undefined\" && window.location.search.includes('switch')) {",
    "if (typeof window !== \"undefined\" && window.location.search.includes('switch')) {\n        logout();"
  );

  fs.writeFileSync(loginPagePath, loginPage, 'utf8');
  console.log('4. Updated app/(auth)/login/page.tsx');
}

// 5. app/candidate-login/page.tsx
const candidateLoginPath = path.join(__dirname, '..', 'app', 'candidate-login', 'page.tsx');
let candidateLogin = fs.readFileSync(candidateLoginPath, 'utf8');

candidateLogin = candidateLogin.replace(
  'const { login } = useAuth();',
  'const { login, logout } = useAuth();'
);

candidateLogin = candidateLogin.replace(
  'const result = await login(email, password);',
  'const result = await login(email, password, { candidateOnly: true });'
);

candidateLogin = candidateLogin.replace(
  'addToast({ type: "error", title: "Wrong Portal", description: "This account is not a candidate account." });',
  'logout();\n        addToast({ type: "error", title: "Wrong Portal", description: "This account is not a candidate account." });'
);

fs.writeFileSync(candidateLoginPath, candidateLogin, 'utf8');
console.log('5. Updated app/candidate-login/page.tsx');

// 6. app/super-admin/login/page.tsx
const superAdminPath = path.join(__dirname, '..', 'app', 'super-admin', 'login', 'page.tsx');
let superAdmin = fs.readFileSync(superAdminPath, 'utf8');

superAdmin = superAdmin.replace(
  'const result = await login(email.trim(), password);',
  'const result = await login(email.trim(), password, { superAdminOnly: true });'
);

fs.writeFileSync(superAdminPath, superAdmin, 'utf8');
console.log('6. Updated app/super-admin/login/page.tsx');

