import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { eventApi } from "../services/api";

interface BadgePreviewProps {
  imageUrl: string;
  name: string;
}

const BadgePreview: React.FC<BadgePreviewProps> = ({ imageUrl, name }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const [badgeBackground, setBadgeBackground] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
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
  }, [eventId]);

  const CardPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      width: '1080px',
      height: '1920px',
      transform: 'scale(0.20)', // Increased from 0.15 to 0.20 to make badge bigger
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full font-sans p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div style={{ width: `${1080 * 0.20}px`, height: `${1920 * 0.20}px`, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <CardPreview>
          <div
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
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
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
                  marginTop: '10px',
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
        marginTop: '10px',
        padding: '8px 16px',
        background: 'black',
        color: 'white',
        borderRadius: '4px',
        fontWeight: '500',
        fontSize: '10px' // Reduced from 12px to 10px to make text smaller
      }}>
        Please take a screenshot of the badge
      </div>
    </div>
  );
};

export default BadgePreview; 