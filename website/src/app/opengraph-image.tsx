import { ImageResponse } from 'next/og';

export const alt = 'Galileo Protocol - Open standard for luxury product authentication';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
          position: 'relative',
        }}
      >
        {/* Subtle gold accent line at top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)',
          }}
        />

        {/* Logo placeholder - gold circle with G */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            border: '2px solid #D4AF37',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#D4AF37',
              fontFamily: 'serif',
            }}
          >
            G
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '80px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            margin: 0,
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          Galileo Protocol
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '32px',
            color: '#A3A3A3',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Open standard for luxury authentication
        </p>

        {/* Subtle gold accent line at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #D4AF37 50%, transparent 100%)',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
