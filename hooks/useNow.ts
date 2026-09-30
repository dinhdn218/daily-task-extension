import { useEffect, useState } from 'react';
import { msUntilNextMinute } from '@/lib/date';

/**
 * Thời điểm hiện tại, cập nhật đúng lúc đổi phút và khi tab hiện lại.
 * Qua nửa đêm thì ngày suy ra từ giá trị này cũng tự đổi.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, msUntilNextMinute(current));
    };
    timer = setTimeout(tick, msUntilNextMinute(new Date()));

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return now;
}
