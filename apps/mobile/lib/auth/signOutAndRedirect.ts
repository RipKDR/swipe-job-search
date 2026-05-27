type SignOutAndRedirectInput = {
  signOut: () => Promise<void>;
  replace: (route: string) => void;
};

export async function signOutAndRedirect({
  signOut,
  replace,
}: SignOutAndRedirectInput): Promise<void> {
  await signOut();
  replace('/(auth)/login');
}
