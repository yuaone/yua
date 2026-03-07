import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: string };

export function ExternalLink({ href, ...rest }: Props) {
  const safeHref = (() => {
    try {
      const parsed = new URL(href);
      if (!/^https?:$/i.test(parsed.protocol)) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  })();

  if (!safeHref) {
    return null;
  }

  return (
    <Link
      target="_blank"
      {...rest}
      href={safeHref as Href}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(safeHref, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
