import React, { useRef, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
// import { Button } from "./ui/button";
// import { Download } from "lucide-react";
import { eventApi } from "../services/api";


interface CardProps {
  imageUrl?: string;
  name?: string;
}

const Card: React.FC<CardProps> = ({ imageUrl: propImageUrl, name: propName }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();
  const [badgeBackground, setBadgeBackground] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [name, setName] = useState<string>('Guest');
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [notificationLink, setNotificationLink] = useState<string>('');

  useEffect(() => {
    const stateImageUrl = location.state?.imageUrl;
    const stateName = location.state?.name;

    const finalImageUrl = stateImageUrl || propImageUrl || '';
    const finalName = stateName || propName || 'Guest';

    setImageUrl(finalImageUrl);
    setName(finalName);

    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        if (eventId) {
          const data = await eventApi.getEventById(eventId);
          const badgeTemplateData = data.admin_details.find(item => item.key === "badge_template");
          const badgeValue = badgeTemplateData?.value || null;

          if (badgeValue && typeof badgeValue === 'object' && 'badge_image' in badgeValue) {
            const badgeImage = (badgeValue as any).badge_image;
            if (typeof badgeImage === 'string') {
              setBadgeBackground(badgeImage);
            } else {
              setBadgeBackground('https://cdn.unthink.ai/img/unthink_ai/WhatsApp%20Image%202025-08-01%20at%2018.50.04_88c66f46_sxfddew.webp');
            }
          } else {
            // Fallback to default image
            setBadgeBackground('https://cdn.unthink.ai/img/unthink_ai/WhatsApp%20Image%202025-08-01%20at%2018.50.04_88c66f46_sxfddew.webp');
          }

          // Set notification message and link
          if (badgeValue && typeof badgeValue === 'object' && 'notification_message' in badgeValue) {
            const notificationMsg = (badgeValue as any).notification_message;
            if (typeof notificationMsg === 'string') {
              setNotificationMessage(notificationMsg);
            }
          }
          if (badgeValue && typeof badgeValue === 'object' && 'link' in badgeValue) {
            const link = (badgeValue as any).link;
            if (typeof link === 'string') {
              // Construct the full URL
              const fullLink = `${window.location.origin}/${link}`;
              setNotificationLink(fullLink);
              console.log(notificationLink)
            }
          }
        } else {
          // Fallback to default image if no eventId
          setBadgeBackground('https://cdn.unthink.ai/img/unthink_ai/WhatsApp%20Image%202025-08-01%20at%2018.50.04_88c66f46_sxfddew.webp');
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
        // Fallback to default image on error
        setBadgeBackground('https://cdn.unthink.ai/img/unthink_ai/WhatsApp%20Image%202025-08-01%20at%2018.50.04_88c66f46_sxfddew.webp');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [propImageUrl, propName, location.state, eventId]);

  // const handleDownload = async () => {
  //   setIsLoading(true);

  //   try {
  //     const canvas = document.createElement('canvas');
  //     const ctx = canvas.getContext('2d');

  //     if (!ctx) {
  //       throw new Error('Could not get canvas context');
  //     }

  //     // Set canvas dimensions to match badge size
  //     canvas.width = 1080;
  //     canvas.height = 1920;

  //     // Load background image
  //     const backgroundImg = new Image();
  //     backgroundImg.crossOrigin = 'anonymous';

  //     await new Promise((resolve, reject) => {
  //       backgroundImg.onload = resolve;
  //       backgroundImg.onerror = reject;
  //       backgroundImg.src = badgeBackground;
  //     });

  //     // Draw background
  //     ctx.drawImage(backgroundImg, 0, 0, 1080, 1920);

  //     // Load and draw user image if available
  //     if (imageUrl) {
  //       try {
  //         const userImg = new Image();
  //         userImg.crossOrigin = 'anonymous';

  //         await new Promise((resolve) => {
  //           userImg.onload = resolve;
  //           userImg.onerror = resolve; 
  //           userImg.src = imageUrl;
  //         });


  //         const photoX = 260; 
  //         const photoY = 460; 
  //         const photoWidth = 580;
  //         const photoHeight = 1015; 

  //         ctx.strokeStyle = 'red';
  //         ctx.lineWidth = 0;
  //         ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);

  //         // Draw user image
  //         ctx.drawImage(userImg, photoX, photoY, photoWidth, photoHeight);
  //       } catch (error) {
  //         console.log('User image failed to load, continuing without it');
  //       }
  //     }

  //     // Draw name text
  //     ctx.fillStyle = 'white';
  //     ctx.font = 'bold 60px system-ui, sans-serif';
  //     ctx.textAlign = 'center';
  //     ctx.textBaseline = 'middle';

  //     // Add text shadow
  //     ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  //     ctx.shadowBlur = 8;
  //     ctx.shadowOffsetX = 2;
  //     ctx.shadowOffsetY = 2;

  //     // Draw name text (moved significantly lower)
  //     const textY = 1550; // Moved much lower

  //     // Draw the actual text with bigger font
  //     ctx.fillStyle = 'white';
  //     ctx.font = 'bold 80px system-ui, sans-serif';
  //     ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  //     ctx.shadowBlur = 4;
  //     ctx.fillText(name, 540, textY);

  //     // Download the canvas as image
  //     const dataURL = canvas.toDataURL('image/png');
  //     const link = document.createElement('a');
  //     link.href = dataURL;
  //     link.download = `${name}-badge.png`;
  //     link.click();

  //   } catch (error) {
  //     console.error("Error generating badge image:", error);
  //     alert("There was an error generating the badge image. Please try again.");
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const CardPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      width: '1080px',
      height: '1920px',
      transform: 'scale(0.3)',
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 w-full font-sans p-4 bg-gray-100">
      <div style={{ width: `${1080 * 0.3}px`, height: `${1920 * 0.3}px`, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <CardPreview>
          <div
            ref={cardRef}
            style={{
              width: '1080px',
              height: '1920px',
              backgroundImage: isLoading ? 'none' : `url(${badgeBackground})`,
              backgroundColor: isLoading ? '#ccc' : '#000',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'system-ui, sans-serif'
            }}
          >
            {isLoading ? (
              <p style={{ color: 'white', fontSize: '40px' }}>Loading Badge...</p>
            ) : (
              // This container uses Flexbox to center the content vertically
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // Moving content higher up on the badge
                paddingTop: '50px'
              }}>
                {/* User Photo */}
                <div style={{
                  width: '580px',
                  height: '1020px',
                  border: '0px solid red',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
                  marginTop: '123px',
                  marginLeft: '30px',
                  marginBottom: '20px'
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
                      justifyContent: 'center'
                    }}>
                      <span style={{ color: '#6b7280', fontSize: '32px' }}>No Photo</span>
                    </div>
                  )}
                </div>

                {/* User Name */}
                <div style={{
                  background: 'transparent',
                  padding: '15px 35px',
                  borderRadius: '15px',
                  marginTop: '10px', // Reduced to move name up
                  position: 'relative',
                  marginBottom: '30px'
                }}>
                  {/* Yellow Tape Background */}
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
                  <p style={{
                    fontWeight: 'bold',
                    fontSize: '80px',
                    color: 'white',
                    textAlign: 'center',
                    textTransform: 'capitalize',
                    margin: 0,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    maxWidth: '700px',
                    wordWrap: 'break-word',
                    lineHeight: '1.1',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    {name}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardPreview>
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: '20px',
        padding: '12px 24px',
        background: 'black',
        color: 'white',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '16px'
      }}>
        Please take a screenshot of the badge
      </div>

      {/* Notification Message Box */}
      {(notificationMessage) || true && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 shadow-md" style={{ width: `${1080 * 0.25}px` }}>
          <p className="mb-2 text-sm leading-relaxed text-gray-800 font-medium">
            {notificationMessage || "Looking good! You are all set. Wait for the event to go live and click on this"}
          </p>
          <div className="text-center">
            <a
              href={notificationLink || 'https://eventapplication-314035436999.us-central1.run.app/event/checkin_agent_778945_test2_event_d463d063'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 underline text-sm font-medium"
            >
              link
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Card;