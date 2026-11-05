"use client";

import { useEffect, useRef } from "react";
import { errorMessage } from "./api";

type Intent = "capture" | "authorize";

// Just the parts of the PayPal JS SDK this button uses.
type Buttons = { render(container: HTMLElement): Promise<void>; close(): Promise<void> };
type PayPalSdk = {
  Buttons(options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: () => void;
  }): Buttons;
};

type Props = {
  clientId: string;
  intent: Intent;
  createOrder: () => Promise<string>;
  onApprove: (orderId: string) => Promise<void>;
  onError: (message: string) => void;
};

// One SDK per intent, because an order's intent must match the SDK's.
const sdks = new Map<Intent, Promise<PayPalSdk>>();

function loadSdk(clientId: string, intent: Intent): Promise<PayPalSdk> {
  let sdk = sdks.get(intent);
  if (!sdk) {
    sdk = new Promise((resolve, reject) => {
      const namespace = `paypal_${intent}`;
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({
        "client-id": clientId,
        currency: "USD",
        intent,
      })}`;
      script.dataset.namespace = namespace;
      script.onload = () => resolve((window as unknown as Record<string, PayPalSdk>)[namespace]);
      script.onerror = () => {
        sdks.delete(intent);
        reject(new Error("The PayPal button didn't load. Refresh and try again."));
      };
      document.body.appendChild(script);
    });
    sdks.set(intent, sdk);
  }
  return sdk;
}

export function PayPalButton(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);

  useEffect(() => {
    latest.current = props;
  });

  useEffect(() => {
    let cancelled = false;
    let buttons: Buttons | undefined;
    // Set when our own code reported the error, so PayPal's generic one isn't shown on top.
    let reported = false;

    function report(error: unknown) {
      reported = true;
      latest.current.onError(errorMessage(error));
    }

    loadSdk(props.clientId, props.intent)
      .then((paypal) => {
        if (cancelled || !container.current) return;
        buttons = paypal.Buttons({
          createOrder: async () => {
            reported = false;
            try {
              return await latest.current.createOrder();
            } catch (error) {
              report(error);
              throw error;
            }
          },
          onApprove: async (data) => {
            try {
              await latest.current.onApprove(data.orderID);
            } catch (error) {
              report(error);
            }
          },
          onError: () => {
            if (!reported) latest.current.onError("PayPal reported an error. Please try again.");
          },
        });
        return buttons.render(container.current);
      })
      .catch(report);

    return () => {
      cancelled = true;
      buttons?.close().catch(() => {});
    };
  }, [props.clientId, props.intent]);

  return <div ref={container} />;
}
