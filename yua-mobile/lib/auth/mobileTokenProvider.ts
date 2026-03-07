type TokenProvider = () => Promise<string | null>;

const emptyProvider: TokenProvider = async () => null;

let activeTokenProvider: TokenProvider = emptyProvider;

export function setMobileTokenProvider(provider: TokenProvider): () => void {
  activeTokenProvider = provider;
  return () => {
    if (activeTokenProvider === provider) {
      activeTokenProvider = emptyProvider;
    }
  };
}

export async function getMobileToken(): Promise<string | null> {
  return activeTokenProvider();
}
