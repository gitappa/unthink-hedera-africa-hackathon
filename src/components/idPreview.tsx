import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { userApi } from "../services/api";

interface IdPreviewProps {
  imageUrl?: string;
  name?: string;
}

const IdPreview: React.FC<IdPreviewProps> = ({ imageUrl: propImageUrl, name: propName }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const { eventId } = useParams<{ eventId: string }>();

  const [badgeBackground, setBadgeBackground] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [badgeMessage, setBadgeMessage] = useState<string>("");
  const [name, setName] = useState<string>("Guest");
  const [paymentSuccess, setPaymentSuccess] = useState<boolean | null>(null);
  const [isPaymentPending, setIsPaymentPending] = useState<boolean>(false);
  const [eventData, setEventData] = useState<any>(null);
  const hasInitializedRef = useRef<boolean>(false);

  // Function to save user info with event_details using the API service
  const saveUserInfoWithEventDetails = async (paymentStatus: 'success' | 'failure') => {
    const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userIdBadge") : null;
    
    if (!storedUserId || !eventId) {
      console.log('Missing userId or eventId for saving user info');
      return;
    }

    await userApi.saveUserInfoWithEventDetails({
      userId: storedUserId,
      eventId: eventId,
      currentGroup: eventData?.current_group,
      paymentStatus
    });
  };

  useEffect(() => {
    const defaultBadge = "https://cdn.unthink.ai/img/unthink_ai/WhatsApp%20Image%202025-08-01%20at%2018.50.04_88c66f46_sxfddew.webp";

    const init = async () => {
      // Prevent double-execution (e.g., React StrictMode in dev)
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      setIsLoading(true);
      try {
        //0) Check if p2p parameter exists in URL
        const fullUrl = typeof window !== "undefined" ? window.location.href : "";
        const urlObj = new URL(fullUrl);
        const p2pStr = urlObj.searchParams.get("p2p");

        if (p2pStr) {
          // If p2p exists, continue with current payment verification flow
          try {
            let p2pObj: any = null;
            try {
              p2pObj = JSON.parse(p2pStr);
            } catch {
              await saveUserInfoWithEventDetails('failure');
              setPaymentSuccess(false);
              setIsPaymentPending(true);
              return;
            }

            const paymentRes = await fetch(
              "https://droppbackend-314035436999.us-central1.run.app/api/payments/process-payment",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(p2pObj),
              }
            );

            if (!paymentRes.ok) {
              await saveUserInfoWithEventDetails('failure');
              setPaymentSuccess(false);
              setIsPaymentPending(true);
              return;
            }

            const paymentData = await paymentRes.json();
            console.log('paymentDatas', paymentData);
            if (paymentData?.success === true) {
              await saveUserInfoWithEventDetails('success');
              setPaymentSuccess(true);
            } else {
              await saveUserInfoWithEventDetails('failure');
              setPaymentSuccess(false);
              setIsPaymentPending(true);
              return;
            }
          } catch {
            await saveUserInfoWithEventDetails('failure');
            setPaymentSuccess(false);
            setIsPaymentPending(true);
            return;
          }
        } else {
          // If p2p doesn't exist, check payment_status in event_details
          const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userIdBadge") : null;
          
          if (!storedUserId || !eventId) {
            setPaymentSuccess(false);
            setIsPaymentPending(true);
            return;
          }

          try {
            // Get user info to check event_details
            const userRes = await fetch(
              `https://auraprod.unthink.ai/users/get_user_info/?user_id=${encodeURIComponent(storedUserId)}`,
              { method: "GET" }
            );

            if (userRes.ok) {
              const userData = await userRes.json();
              const eventDetails = userData?.data?.event_details || {};

              const serviceId = `${eventId} (${eventData?.current_group || 'default'})`;
              console.log('serviceId', serviceId);
              // Check if payment_status exists for this event
              const eventDataArray = eventDetails[serviceId];
              if (eventDataArray && Array.isArray(eventDataArray)) {
                const paymentStatusEntry = eventDataArray.find((entry: any) => entry.key === "payment_status");
                if (paymentStatusEntry && paymentStatusEntry.value && paymentStatusEntry.value.length > 0) {
                  const lastPaymentStatus = paymentStatusEntry.value[paymentStatusEntry.value.length - 1];
                  if (lastPaymentStatus === 'success') {
                    setPaymentSuccess(true);
                  } else {
                    setPaymentSuccess(false);
                    setIsPaymentPending(true);
                  }
                } else {
                  setPaymentSuccess(false);
                  setIsPaymentPending(true);
                }
              } else {
                setPaymentSuccess(false);
                setIsPaymentPending(true);
              }
            } else {
              setPaymentSuccess(false);
              setIsPaymentPending(true);
            }
          } catch {
            setPaymentSuccess(false);
            setIsPaymentPending(true);
          }
        }

        // 1) Fetch badge template background using eventId from URL
        if (eventId) {
          try {
            const res = await fetch(
              `https://auraprod.unthink.ai/agent_collection/get/service_id/${encodeURIComponent(eventId)}/`,
              { method: "GET" }
            );
            if (res.ok) {
              const data = await res.json();
              setEventData(data?.data); // Store the event data
              const adminDetails = Array.isArray(data?.data?.admin_details) ? data.data.admin_details : [];
              const badgeItem = adminDetails.find((item: any) => item?.key === "badge_template");
              setBadgeMessage(badgeItem?.message);
              const value = badgeItem?.value;
              if (typeof value === "string" && value.trim().length > 0) {
                setBadgeBackground(value);
              } else {
                setBadgeBackground(defaultBadge);
              }
            } else {
              setBadgeBackground(defaultBadge);
            }
          } catch {
            setBadgeBackground(defaultBadge);
          }
        } else {
          setBadgeBackground(defaultBadge);
        }

        // 2) Fetch user profile image and first name using userIdBadge from localStorage
        const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userIdBadge") : null;

        // Fallbacks to props if present
        const fallbackImage = propImageUrl || "";
        const fallbackName = propName || "Guest";

        if (storedUserId) {
          try {
            const userRes = await fetch(
              `https://auraprod.unthink.ai/users/get_user_info/?user_id=${encodeURIComponent(storedUserId)}`,
              { method: "GET" }
            );
            if (userRes.ok) {
              const userData = await userRes.json();
              const profileImage = userData?.data?.profile_image;
              const firstName = userData?.data?.first_name || userData?.data?.name || '';

              if (typeof profileImage === "string" && profileImage.trim().length > 0) {
                setImageUrl(profileImage);
              } else {
                setImageUrl(fallbackImage);
              }

              if (typeof firstName === "string" && firstName.trim().length > 0) {
                setName(firstName);
              } else {
                setName(fallbackName);
              }
            } else {
              setImageUrl(fallbackImage);
              setName(fallbackName);
            }
          } catch {
            setImageUrl(fallbackImage);
            setName(fallbackName);
          }
        } else {
          setImageUrl(fallbackImage);
          setName(fallbackName);
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [eventId, propImageUrl, propName]);

  const CardPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      width: '1920px',
      height: '1080px',
      transform: 'scale(0.25)',
      transformOrigin: 'top left',
      margin: '0 auto',
    }}>
      {children}
    </div>
  );

  const renderMessageWithLinks = (text: string) => {
		const combinedRegex = /(link\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)/gi;

		const getShortLabel = (urlString: string) => {
			try {
				const u = new URL(urlString);
				return u.hostname.replace(/^www\./i, '');
			} catch {
				return 'link';
			}
		};

		const nodes: React.ReactNode[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = combinedRegex.exec(text)) !== null) {
			const matchStart = match.index;
			const matchEnd = combinedRegex.lastIndex;

			if (matchStart > lastIndex) {
				nodes.push(
					<React.Fragment key={`txt-${lastIndex}`}>
						{text.slice(lastIndex, matchStart)}
					</React.Fragment>
				);
			}

			const url = match[2] || match[3];
			const isNamedLink = Boolean(match[2]);
			const label = isNamedLink ? 'link' : getShortLabel(url);

			nodes.push(
				<a
					key={`url-${matchStart}`}
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={() => {
						try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
					}}
					style={{
						color: '#60a5fa',
						textDecoration: 'underline',
						cursor: 'pointer',
					}}
				>
					{label}
				</a>
			);

			lastIndex = matchEnd;
		}

		if (lastIndex < text.length) {
			nodes.push(
				<React.Fragment key={`txt-${lastIndex}`}>
					{text.slice(lastIndex)}
				</React.Fragment>
			);
		}

		return nodes;
	};


  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 w-full font-sans p-4 bg-gray-100">
      {paymentSuccess === null && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shadow" style={{ width: `${1920 * 0.25}px` }}>
          <p className="text-gray-700 font-semibold text-center">Verifying payment...</p>
        </div>
      )}

      {(paymentSuccess === true || isPaymentPending) && (
        <>
          <div style={{ width: `${1920 * 0.25}px`, height: `${1080 * 0.25}px` }}>
            <CardPreview>
              <div
                ref={cardRef}
                style={{
                  width: '1920px',
                  height: '1080px',
                  backgroundImage: isLoading ? 'none' : `url(${badgeBackground})`,
                  backgroundColor: isLoading ? '#ccc' : '#f3f4f6',
                  backgroundSize: 'contain',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right center',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'system-ui, sans-serif'
                }}
              >
                {isLoading ? (
                  <p style={{ color: 'white', fontSize: '40px' }}>Loading Badge...</p>
                ) : (
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%'
                  }}>
                    {/* Image positioned independently */}
                    <div style={{
                      position: 'absolute',
                      width: '285px',
                      height: '285px',
                      border: '0px solid red',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                      top: '775px',
                      left: '1600px'
                    }}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="User"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#d1d5db',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%'
                        }}>
                          <span style={{ color: '#6b7280', fontSize: '32px' }}>No Photo</span>
                        </div>
                      )}
                    </div>

                    {/* Name positioned independently */}
                    <div style={{
                      position: 'absolute',
                      background: 'transparent',
                      padding: '20px 40px',
                      borderRadius: '15px',
                      top: '870px',
                      left: '300px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '0px',
                        left: '-20px',
                        right: '-20px',
                        bottom: '0px',
                        backgroundColor: '#FFD700',
                        borderRadius: '8px',
                        transform: 'rotate(-2deg)',
                        zIndex: -1,
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                      }} />
                      {isPaymentPending ? (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          gap: '20px',
                          flexWrap: 'wrap'
                        }}>
                          <p style={{
                            fontWeight: 'bold',
                            fontSize: '80px',
                            color: 'white',
                            textAlign: 'center',
                            textTransform: 'capitalize',
                            margin: 0,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            maxWidth: '400px',
                            wordWrap: 'break-word',
                            lineHeight: '1.1',
                            position: 'relative',
                        
                            zIndex: 1
                          }}>
                            {name}
                          </p>
                          <p style={{
                            fontWeight: 'bold',
                            fontSize: '50px',
                            color: 'white',
                            textAlign: 'center',
                            margin: 0,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                            position: 'relative',
                            marginTop: '20px',
                            zIndex: 1
                          }}>
                            (Pay at the counter)
                          </p>
                        </div>
                      ) : (
                        <p style={{
                          fontWeight: 'bold',
                          fontSize: '80px',
                          color: 'white',
                          textAlign: 'center',
                          textTransform: 'capitalize',
                          margin: 0,
                          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                          maxWidth: '600px',
                          wordWrap: 'break-word',
                          lineHeight: '1.1',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          {name}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardPreview>
          </div>

		  <div style={{
          marginTop: '16px',
          padding: '10px 14px',
          background: '#7c3aed',
          color: 'white',
          borderRadius: '6px',
          fontWeight: 500,
          fontSize: '16px',
          lineHeight: 1.4,
          maxWidth: `${1920 * 0.25}px`,
          width: '100%',
          boxSizing: 'border-box',
          textAlign: 'left',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
          marginLeft: '40px',
          fontFamily: 'Roboto'
          }}>
            {renderMessageWithLinks(badgeMessage || 'Please take a screenshot of the event badge')}
          </div>
        </>
      )}
    </div>
  );
};

export default IdPreview;


