import { AppSettings } from '../types';

/**
 * Returns a high-resolution base64 PNG data URL of the official school logo.
 * If user uploaded a custom logo in settings.logoBase64, returns that.
 * Otherwise, renders the official SMP Islam At-Toyib 45 emblem onto an in-memory canvas.
 */
export const getSchoolLogoDataUrl = async (settings: AppSettings): Promise<string> => {
  if (settings.logoBase64 && settings.logoBase64.startsWith('data:image')) {
    return settings.logoBase64;
  }

  // Generate crisp emblem on canvas as PNG Data URL
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 280;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      // Clear
      ctx.clearRect(0, 0, 240, 280);

      // Draw Islamic Shield Emblem
      // Shield gradient
      const grad = ctx.createLinearGradient(120, 10, 120, 270);
      grad.addColorStop(0, '#075B36');
      grad.addColorStop(1, '#054327');

      // Outer Shield Path
      ctx.beginPath();
      ctx.moveTo(120, 10);
      ctx.bezierCurveTo(60, 10, 20, 40, 20, 75);
      ctx.bezierCurveTo(20, 170, 90, 245, 120, 268);
      ctx.bezierCurveTo(150, 245, 220, 170, 220, 75);
      ctx.bezierCurveTo(220, 40, 180, 10, 120, 10);
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#E5F5EC';
      ctx.stroke();

      // Inner Golden Border
      ctx.beginPath();
      ctx.moveTo(120, 22);
      ctx.bezierCurveTo(68, 22, 32, 48, 32, 78);
      ctx.bezierCurveTo(32, 160, 94, 230, 120, 252);
      ctx.bezierCurveTo(146, 230, 208, 160, 208, 78);
      ctx.bezierCurveTo(208, 48, 172, 22, 120, 22);
      ctx.closePath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#F59E0B';
      ctx.stroke();

      // Mosque Mihrab / Dome silhouette in center
      ctx.fillStyle = '#097345';
      ctx.beginPath();
      ctx.arc(120, 95, 45, Math.PI, 0, false);
      ctx.lineTo(165, 170);
      ctx.lineTo(75, 170);
      ctx.closePath();
      ctx.fill();

      // Golden Star & Crescent
      ctx.fillStyle = '#FBBF24';
      ctx.beginPath();
      ctx.arc(120, 80, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#097345';
      ctx.beginPath();
      ctx.arc(126, 77, 13, 0, Math.PI * 2);
      ctx.fill();

      // 5-point Star
      ctx.fillStyle = '#FDE047';
      drawStar(ctx, 128, 75, 5, 7, 3.5);

      // Open Al-Qur'an / Book
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      // Left page
      ctx.moveTo(120, 145);
      ctx.quadraticCurveTo(95, 135, 75, 142);
      ctx.lineTo(75, 160);
      ctx.quadraticCurveTo(95, 153, 120, 163);
      // Right page
      ctx.quadraticCurveTo(145, 153, 165, 160);
      ctx.lineTo(165, 142);
      ctx.quadraticCurveTo(145, 135, 120, 145);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#D97706';
      ctx.stroke();

      // Ribbon / Banner for "AT-TOYIB 45"
      ctx.fillStyle = '#05331E';
      ctx.beginPath();
      ctx.roundRect(45, 185, 150, 32, 6);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FBBF24';
      ctx.stroke();

      // Text "AT-TOYIB 45"
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('AT-TOYIB 45', 120, 206);

      // Text "SMP ISLAM"
      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('SMP ISLAM', 120, 125);

      resolve(canvas.toDataURL('image/png'));
    } catch {
      resolve('');
    }
  });
};

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}
