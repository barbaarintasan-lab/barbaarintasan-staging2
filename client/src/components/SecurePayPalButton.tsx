import React, { useEffect } from "react";

interface SecurePayPalButtonProps {
  planType: "monthly" | "yearly";
  courseId?: string;
  onSuccess?: (orderData: any) => void;
  onError?: (error: any) => void;
}

export default function SecurePayPalButton({
  planType,
  courseId,
  onSuccess,
  onError,
}: SecurePayPalButtonProps) {
  const createOrder = async () => {
    const endpoint = courseId 
      ? "/api/paypal/create-course-order" 
      : "/api/paypal/create-subscription-order";
    
    const payload = courseId 
      ? { courseId, planType }
      : { planType };
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create order");
    }
    
    const output = await response.json();
    return { orderId: output.id };
  };

  const captureOrder = async (orderId: string) => {
    const response = await fetch(`/paypal/order/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  };

  const handleApprove = async (data: any) => {
    console.log("onApprove", data);
    const orderData = await captureOrder(data.orderId);
    console.log("Capture result", orderData);
    if (onSuccess) {
      onSuccess(orderData);
    }
  };

  const handleCancel = async (data: any) => {
    console.log("onCancel", data);
  };

  const handleError = async (data: any) => {
    console.log("onError", data);
    if (onError) {
      onError(data);
    }
  };

  useEffect(() => {
    const loadPayPalSDK = async () => {
      try {
        if (!(window as any).paypal) {
          const script = document.createElement("script");
          script.src = import.meta.env.PROD
            ? "https://www.paypal.com/web-sdk/v6/core"
            : "https://www.sandbox.paypal.com/web-sdk/v6/core";
          script.async = true;
          script.onload = () => initPayPal();
          document.body.appendChild(script);
        } else {
          await initPayPal();
        }
      } catch (e) {
        console.error("Failed to load PayPal SDK", e);
      }
    };

    loadPayPalSDK();
  }, []);

  const initPayPal = async () => {
    try {
      const clientToken: string = await fetch("/paypal/setup")
        .then((res) => res.json())
        .then((data) => {
          return data.clientToken;
        });
      const sdkInstance = await (window as any).paypal.createInstance({
        clientToken,
        components: ["paypal-payments"],
      });

      const paypalCheckout =
            sdkInstance.createPayPalOneTimePaymentSession({
              onApprove: handleApprove,
              onCancel: handleCancel,
              onError: handleError,
            });

      const onClick = async () => {
        try {
          const checkoutOptionsPromise = createOrder();
          await paypalCheckout.start(
            { paymentFlow: "auto" },
            checkoutOptionsPromise,
          );
        } catch (e) {
          console.error(e);
          if (onError) {
            onError(e);
          }
        }
      };

      const paypalButton = document.getElementById("secure-paypal-button");

      if (paypalButton) {
        paypalButton.addEventListener("click", onClick);
      }

      return () => {
        if (paypalButton) {
          paypalButton.removeEventListener("click", onClick);
        }
      };
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button
      id="secure-paypal-button"
      data-testid="paypal-checkout-button"
      className="w-full bg-[#0070ba] hover:bg-[#003087] text-white font-bold py-4 px-8 rounded-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.771.771 0 0 1 .76-.644h6.302c2.09 0 3.564.652 4.384 1.936.374.584.59 1.226.66 1.912.076.746-.01 1.614-.262 2.58l-.012.046v.013c-.63 2.647-2.08 4.098-4.47 4.467-.38.059-.794.089-1.235.089H9.254a.942.942 0 0 0-.93.79l-.8 5.118a.778.778 0 0 1-.769.667h-.003l.324-2.128.001-.005.276-1.783a.778.778 0 0 1 .77-.666h1.176c.441 0 .855-.03 1.235-.089 2.39-.369 3.84-1.82 4.47-4.467.26-.966.338-1.833.262-2.58-.07-.686-.286-1.328-.66-1.912-.82-1.284-2.294-1.936-4.384-1.936H4.944a.771.771 0 0 0-.76.644l-3.107 16.877a.641.641 0 0 0 .633.74h4.366z"/>
      </svg>
      <span className="text-lg">Ku bixi PayPal</span>
    </button>
  );
}
