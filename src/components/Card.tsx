import React, { useRef, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Download, IdCard } from "lucide-react";
import html2canvas from "html2canvas";

interface BadgeTemplateInfo {
  badge_name: string;
  small_message: string;
  admin_social_media: string;
  logo_url: string;
}

interface UserInfo {
  name: string;
  photo: string;
}

const Card: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', photo: '' });
  const [badgeTemplateInfo, setBadgeTemplateInfo] = useState<BadgeTemplateInfo>({
    badge_name: '',
    small_message: '',
    admin_social_media: '',
    logo_url: ''
  });
  console.log("asas", userInfo.photo)

  useEffect(() => {
    // Get user name from localStorage
    const userName = localStorage.getItem('userName') || 'Guest';
    const userPhoto = localStorage.getItem('uploadedImage') || '';
    const badgeData = localStorage.getItem('badgeTemplateInfo');

    setUserInfo({
      name: userName,
      photo: userPhoto
    });

    if (badgeData) {
      try {
        const parsedBadgeData = JSON.parse(badgeData);
        setBadgeTemplateInfo(parsedBadgeData);
      } catch (error) {
        console.error('Error parsing badge template info:', error);
      }
    }
  }, []);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      // Add a small delay to ensure all styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#2BAFAD',
        ignoreElements: (element) => {
          // Skip elements that might have problematic styles
          return element.classList?.contains('skip-capture') || false;
        }
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `${userInfo.name}-card.png`;
      link.click();
    } catch (error) {
      console.error("Error generating ID card image:", error);
      alert("There was an error generating the card image. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 w-full max-w-sm mx-auto font-sans p-4" style={{ backgroundColor: '#f3f4f6' }}>
      <div
        ref={cardRef}
        style={{
          position: 'relative',
          width: '340px',
          height: '540px',
          overflow: 'hidden',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          backgroundColor: '#2BAFAD',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        {/* Orange Top Bar */}
        <div style={{ height: '64px', backgroundColor: '#F5824F' }}>
          <div style={{ backgroundColor: '#F5824F', padding: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IdCard style={{ height: '24px', width: '24px', color: 'white' }} />
                <h3 style={{ fontWeight: 'bold', fontSize: '18px', color: 'white', margin: 0 }}>
                  {badgeTemplateInfo.badge_name || 'Event Badge'}
                </h3>
              </div>
              <div style={{ fontSize: '14px', color: 'white' }}>
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Photo */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', alignSelf: 'flex-start', color: '#f3f4f6', margin: 0, lineHeight: 1, marginLeft: '-8px', marginTop: '-8px' }}>
            Powered by unthink.ai
          </p>
          <div style={{ marginTop: '24px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '50%', backgroundColor: '#502F7E' }}>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: '#F5824F' }}>
                {userInfo.photo ? (
                  <img
                    src={userInfo.photo}
                    alt="User"
                    style={{ width: '160px', height: '160px', objectFit: 'cover', borderRadius: '50%', border: '1px solid white' }}
                  />
                ) : (
                  <div style={{ width: '160px', height: '160px', borderRadius: '50%', backgroundColor: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#6b7280', fontSize: '14px' }}>No Photo</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Name box */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#2BAFAD', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px', width: '85%' }}>
            <p style={{ fontWeight: 'bold', fontSize: '32px', color: 'white', textAlign: 'center', textTransform: 'capitalize', margin: 0, lineHeight: 1 }}>
              {userInfo.name}
            </p>
          </div>
        </div>

        {/* Bottom-left section */}
        <div style={{ position: 'absolute', bottom: '32px', left: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', textAlign: 'left' }}>
          <div style={{ backgroundColor: '#2BAFAD', borderRadius: '8px', paddingTop: '4px', paddingBottom: '4px' }}>
            <p style={{ fontSize: '12px', fontStyle: 'italic', fontWeight: '600', color: '#f3f4f6', letterSpacing: '0.05em', margin: 0, lineHeight: 1 }}>
              {badgeTemplateInfo.small_message || 'Thank you'}
            </p>
          </div>
          <p style={{ fontSize: '14px', fontWeight: '600', color: 'white', margin: 0, lineHeight: 1 }}>
            {badgeTemplateInfo.admin_social_media || '@admin'}
          </p>
        </div>

        {/* Logo */}
        {badgeTemplateInfo.logo_url && (
          <img
            src={badgeTemplateInfo.logo_url}
            alt="Logo"
            style={{ position: 'absolute', bottom: '20px', right: '20px', width: '96px', height: 'auto' }}
          />
        )}
      </div>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'linear-gradient(to right, #fb923c, #ea580c)',
          color: 'white',
          padding: '12px 24px',
          fontWeight: '600',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
      >
        <Download style={{ height: '20px', width: '20px' }} />
        <span style={{ fontSize: '16px' }}>Download your badge</span>
      </Button>
    </div>
  );
};

export default Card;