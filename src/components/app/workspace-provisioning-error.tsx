import { Button } from "@/components/ui/button";
import { signOutAction } from "@/modules/auth/actions";

export function WorkspaceProvisioningError() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-semibold">Workspace unavailable</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        We could not set up or repair your personal workspace. Try signing out
        and back in. If the problem continues, contact support.
      </p>
      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </div>
  );
}
