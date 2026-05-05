interface WorkspaceUser {
  email: string;
  role: string;
  brandId?: string | null;
  walletAddress?: string | null;
  brand?: {
    name: string;
    slug: string;
  } | null;
}

export interface WorkspaceStatusItem {
  title: string;
  detail: string;
}

const APPROVED_WORKSPACE_ROLES = new Set(["ADMIN", "BRAND_ADMIN", "OPERATOR"]);

function formatRole(role: string) {
  return role.toLowerCase().split("_").join(" ");
}

function formatWalletAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function evaluateWorkspaceAccess(user: WorkspaceUser | null) {
  if (!user) {
    return {
      isEligible: false,
      readinessLabel: "Authentication required",
      activeBrandName: "No workspace",
      roleSummary: "Signed out",
      blockingItems: [
        {
          title: "Sign in required",
          detail:
            "Authenticate with an approved Galileo account to review workspace access.",
        },
      ] as WorkspaceStatusItem[],
      infoItems: [] as WorkspaceStatusItem[],
    };
  }

  const blockingItems: WorkspaceStatusItem[] = [];
  const infoItems: WorkspaceStatusItem[] = [];

  const roleAllowed = APPROVED_WORKSPACE_ROLES.has(user.role);
  const brandAssigned = Boolean(user.brandId && user.brand);

  if (roleAllowed) {
    infoItems.push({
      title: "Role confirmed",
      detail: `${formatRole(user.role)} access is approved for the current brand workspace.`,
    });
  } else {
    blockingItems.push({
      title: "Role approval required",
      detail:
        "This account can authenticate, but only ADMIN, BRAND_ADMIN, and OPERATOR can enter the pilot workspace.",
    });
  }

  if (brandAssigned && user.brand) {
    infoItems.push({
      title: "Brand assignment confirmed",
      detail: `${user.brand.name} is the active workspace context for this session.`,
    });
  } else {
    blockingItems.push({
      title: "Brand assignment required",
      detail:
        "Your account is signed in, but it is not assigned to the pilot brand workspace yet.",
    });
  }

  if (user.walletAddress) {
    infoItems.push({
      title: "Wallet linked",
      detail: `${formatWalletAddress(user.walletAddress)} is available for signature-based operator actions.`,
    });
  } else {
    infoItems.push({
      title: "Wallet optional for now",
      detail:
        "Email and password access is enough for the demo room. Link a wallet when signature-based actions are needed.",
    });
  }

  infoItems.push({
    title: "Brand workspace scope",
    detail:
      "This dashboard stays scoped to one active brand context for a clean operator workflow.",
  });

  const isEligible = roleAllowed && brandAssigned;

  return {
    isEligible,
    readinessLabel: isEligible ? "Workspace ready" : "Action required",
    activeBrandName: user.brand?.name ?? "Unassigned workspace",
    roleSummary: formatRole(user.role),
    blockingItems,
    infoItems,
  };
}
