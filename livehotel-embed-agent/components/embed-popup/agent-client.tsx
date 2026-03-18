'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, type RpcInvocationData } from 'livekit-client';
import { motion, useDragControls } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { XIcon } from '@phosphor-icons/react';
import { ErrorMessage } from '@/components/embed-popup/error-message';
import { PopupView } from '@/components/embed-popup/popup-view';
import { Trigger } from '@/components/embed-popup/trigger';
import useConnectionDetails from '@/hooks/use-connection-details';
import { type AppConfig, EmbedErrorDetails } from '@/lib/types';

const PopupViewMotion = motion.create(PopupView);

export type EmbedFixedAgentClientProps = {
  appConfig: AppConfig;
};

function AgentClient({ appConfig }: EmbedFixedAgentClientProps) {
  const isAnimating = useRef(false);
  const dragConstraints = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [panelSize, setPanelSize] = useState({ width: 360, height: 240 });
  const resizeOriginRef = useRef<{
    width: number;
    height: number;
    startX: number;
    startY: number;
    corner: 'se' | 'sw' | 'ne' | 'nw';
  } | null>(null);
  const room = useMemo(() => new Room(), []);
  const [popupOpen, setPopupOpen] = useState(false);
  const [error, setError] = useState<EmbedErrorDetails | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { connectionDetails, refreshConnectionDetails, existingOrRefreshConnectionDetails } =
    useConnectionDetails(appConfig);

  const handleTogglePopup = () => {
    if (isAnimating.current) {
      // prevent re-opening before room has disconnected
      return;
    }

    setError(null);
    setPopupOpen((open) => !open);
  };

  const handlePanelAnimationStart = () => {
    isAnimating.current = true;
  };

  const handlePanelAnimationComplete = () => {
    isAnimating.current = false;
    if (!popupOpen && room.state !== 'disconnected') {
      room.disconnect();
    }
  };

  useEffect(() => {
    const onDisconnected = () => {
      setPopupOpen(false);
      refreshConnectionDetails();
    };
    const onMediaDevicesError = (error: Error) => {
      setError({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
    };
  }, [room, refreshConnectionDetails]);

  useEffect(() => {
    let lastSelectedRoomId: string | null = null;

    // --- Helpers ---

    const parsePayload = (payload?: string) => {
      if (!payload) return {};
      try {
        return JSON.parse(payload) as Record<string, unknown>;
      } catch {
        return {};
      }
    };

    const ok = (data?: Record<string, unknown>) =>
      JSON.stringify({ ok: true, ...(data ?? {}) });
    const err = (message: string) => JSON.stringify({ ok: false, error: message });

    const normalizePath = (path: string) =>
      path.startsWith('/rooms/') ? `/suites/${path.slice('/rooms/'.length)}` : path;

    // Client-side navigation via Next.js App Router's globally exposed router.
    // Next.js sets window.next.router after hydration (app-router-instance.js).
    const navigateClientSide = (path: string, replace = false) => {
      const router = (window as any).next?.router;
      if (router) {
        if (replace) {
          router.replace(path);
        } else {
          router.push(path);
        }
      } else {
        // Fallback if router not yet available (pre-hydration)
        window.location.assign(path);
      }
    };

    // Wait for an element to appear in the DOM
    const waitForElement = (selector: string, timeout = 3000): Promise<Element | null> => {
      const el = document.querySelector(selector);
      if (el) return Promise.resolve(el);
      return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const found = document.querySelector(selector);
          if (found) {
            observer.disconnect();
            resolve(found);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    };

    // Find a form field by label text within a container
    const findFieldByLabel = (
      labelText: string,
      root?: Element | null
    ): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null => {
      const container = root ?? document.getElementById('booking-form');
      if (!container) return null;
      for (const label of container.querySelectorAll('label')) {
        const text = Array.from(label.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent?.trim() ?? '')
          .join(' ')
          .trim();
        if (text.toLowerCase().includes(labelText.toLowerCase())) {
          return label.querySelector('input, select, textarea') as
            | HTMLInputElement
            | HTMLSelectElement
            | HTMLTextAreaElement
            | null;
        }
      }
      return null;
    };

    // Set a React-controlled form field using native property setters
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!;
    const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )!.set!;

    const setFieldValue = (
      field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
      value: string
    ) => {
      if (field instanceof HTMLSelectElement) {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (field instanceof HTMLTextAreaElement) {
        nativeTextAreaSetter.call(field, value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        nativeInputSetter.call(field, value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    // Set a field by label text, waiting for the form to appear if needed
    const setField = async (labelText: string, value: string | undefined) => {
      if (value === undefined) return;
      const form = await waitForElement('#booking-form');
      const field = findFieldByLabel(labelText, form);
      if (field) setFieldValue(field, value);
    };

    // Arrival-time normalization (maps natural language to select option values)
    const arrivalOptions = [
      'Before 12:00 PM',
      '12:00 PM - 3:00 PM',
      '3:00 PM - 6:00 PM',
      'After 6:00 PM',
    ];
    const normalizeArrivalTime = (value?: string): string | undefined => {
      if (!value) return undefined;
      if (arrivalOptions.includes(value)) return value;
      const n = value.toLowerCase();
      if (n.includes('before') || n.includes('morning')) return 'Before 12:00 PM';
      if (n.includes('12') || n.includes('noon') || n.includes('midday'))
        return '12:00 PM - 3:00 PM';
      if (n.includes('3') || n.includes('afternoon')) return '3:00 PM - 6:00 PM';
      if (n.includes('6') || n.includes('evening') || n.includes('after'))
        return 'After 6:00 PM';
      return undefined;
    };

    const resolveSelectedRoomId = () => {
      if (lastSelectedRoomId) return lastSelectedRoomId;
      const match = window.location.pathname.match(/^\/suites\/([^/]+)/);
      return match?.[1] ?? null;
    };

    // --- RPC Handlers (direct DOM manipulation, no page bridge needed) ---

    room.registerRpcMethod('hotel.scroll_to', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const behavior =
        payload.behavior === 'instant'
          ? 'auto'
          : typeof payload.behavior === 'string'
            ? (payload.behavior as ScrollBehavior)
            : 'smooth';

      if (typeof payload.id === 'string') {
        const element = document.getElementById(payload.id);
        if (!element) return err('Element not found');
        element.scrollIntoView({ behavior, block: 'start' });
        return ok({ scrolled: true });
      }

      if (typeof payload.y === 'number') {
        window.scrollTo({ top: payload.y, behavior });
        return ok({ scrolled: true });
      }

      return err('Missing id or y');
    });

    room.registerRpcMethod('hotel.navigate', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const rawPath = payload.path;
      if (typeof rawPath !== 'string' || rawPath.length === 0) return err('Missing path');
      const path = normalizePath(rawPath);
      navigateClientSide(path, Boolean(payload.replace));
      return ok();
    });

    room.registerRpcMethod('hotel.open_booking', async () => {
      const params = new URLSearchParams({ focus: 'booking' });
      const roomId = resolveSelectedRoomId();
      if (roomId) params.set('roomId', roomId);
      navigateClientSide(`/booking?${params.toString()}`);
      return ok();
    });

    room.registerRpcMethod('hotel.select_room', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const roomId = payload.roomId;
      if (typeof roomId !== 'string' || roomId.length === 0) return err('Missing roomId');
      lastSelectedRoomId = roomId;
      navigateClientSide(
        `/booking?roomId=${encodeURIComponent(roomId)}&focus=booking`
      );
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_dates', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      await setField('Check-in', typeof payload.checkIn === 'string' ? payload.checkIn : undefined);
      await setField(
        'Check-out',
        typeof payload.checkOut === 'string' ? payload.checkOut : undefined
      );
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_guests', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const guests = Number(payload.guests);
      await setField('Guests', String(Number.isFinite(guests) ? Math.max(1, guests) : 1));
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_contact', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      await setField('Full name', typeof payload.name === 'string' ? payload.name : undefined);
      await setField('Email', typeof payload.email === 'string' ? payload.email : undefined);
      await setField('Phone', typeof payload.phone === 'string' ? payload.phone : undefined);
      await setField(
        'Special requests',
        typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined
      );
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_address', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      await setField(
        'Address line 1',
        typeof payload.addressLine1 === 'string' ? payload.addressLine1 : undefined
      );
      await setField(
        'Address line 2',
        typeof payload.addressLine2 === 'string' ? payload.addressLine2 : undefined
      );
      await setField('City', typeof payload.city === 'string' ? payload.city : undefined);
      await setField('State', typeof payload.region === 'string' ? payload.region : undefined);
      await setField(
        'Postal code',
        typeof payload.postalCode === 'string' ? payload.postalCode : undefined
      );
      await setField('Country', typeof payload.country === 'string' ? payload.country : undefined);
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_preferences', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      await setField(
        'Arrival time',
        normalizeArrivalTime(
          typeof payload.arrivalTime === 'string' ? payload.arrivalTime : undefined
        )
      );
      await setField(
        'Bed preference',
        typeof payload.bedPreference === 'string' ? payload.bedPreference : undefined
      );
      await setField(
        'Occasion',
        typeof payload.occasion === 'string' ? payload.occasion : undefined
      );
      await setField(
        'Accessibility',
        typeof payload.accessibility === 'string' ? payload.accessibility : undefined
      );
      await setField(
        'Special requests',
        typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined
      );
      return ok();
    });

    room.registerRpcMethod('hotel.confirm_booking', async () => {
      if (window.location.pathname === '/booking') {
        const form = await waitForElement('#booking-form');
        if (!form) return err('Booking form not found');
        const button = form.querySelector<HTMLButtonElement>('button[type="button"]');
        if (!button || button.disabled) return err('Submit button not found or disabled');
        button.click();
        return ok();
      }
      // Not on booking page — navigate with confirm=1 (page handles this via URL param)
      const params = new URLSearchParams({ focus: 'booking', confirm: '1' });
      const roomId = resolveSelectedRoomId();
      if (roomId) params.set('roomId', roomId);
      navigateClientSide(`/booking?${params.toString()}`);
      return ok();
    });

    room.registerRpcMethod('hotel.check_availability', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const roomId =
        typeof payload.roomId === 'string' ? payload.roomId : resolveSelectedRoomId();

      // Read current dates from the DOM if on the booking page
      const form = document.getElementById('booking-form');
      const checkIn = (findFieldByLabel('Check-in', form) as HTMLInputElement | null)?.value;
      const checkOut = (findFieldByLabel('Check-out', form) as HTMLInputElement | null)?.value;
      const guests = (findFieldByLabel('Guests', form) as HTMLInputElement | null)?.value || '1';

      if (!checkIn || !checkOut) {
        // Navigate to booking page to trigger its auto-check on mount
        const params = new URLSearchParams({ focus: 'booking' });
        if (roomId) params.set('roomId', roomId);
        navigateClientSide(`/booking?${params.toString()}`);
        return ok();
      }

      // Call the availability API directly and return real data to the agent
      try {
        const params = new URLSearchParams({ checkIn, checkOut, guests });
        const response = await fetch(`/api/availability?${params.toString()}`);
        const result = await response.json();
        if (!response.ok) return err(result.error ?? 'Unable to check availability');
        return ok(result);
      } catch {
        return err('Unable to reach the availability service');
      }
    });

    return () => {
      room.unregisterRpcMethod?.('hotel.scroll_to');
      room.unregisterRpcMethod?.('hotel.navigate');
      room.unregisterRpcMethod?.('hotel.open_booking');
      room.unregisterRpcMethod?.('hotel.select_room');
      room.unregisterRpcMethod?.('hotel.set_booking_dates');
      room.unregisterRpcMethod?.('hotel.set_booking_guests');
      room.unregisterRpcMethod?.('hotel.set_booking_contact');
      room.unregisterRpcMethod?.('hotel.set_booking_address');
      room.unregisterRpcMethod?.('hotel.set_booking_preferences');
      room.unregisterRpcMethod?.('hotel.confirm_booking');
      room.unregisterRpcMethod?.('hotel.check_availability');
    };
  }, [room]);

  useEffect(() => {
    if (!popupOpen) {
      return;
    }
    if (!connectionDetails) {
      setError({
        title: 'Error fetching connection details',
        description: 'Please try again later',
      });
      return;
    }
    if (room.state !== 'disconnected') {
      return;
    }

    const connect = async () => {
      Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
          preConnectBuffer: appConfig.isPreConnectBufferEnabled,
        }),
        existingOrRefreshConnectionDetails().then((connectionDetails) =>
          room.connect(connectionDetails.serverUrl, connectionDetails.participantToken)
        ),
      ]).catch((error) => {
        if (error instanceof Error) {
          console.error('Error connecting to agent:', error);
          setError({
            title: 'There was an error connecting to the agent',
            description: `${error.name}: ${error.message}`,
          });
        }
      });
    };

    connect();
  }, [
    room,
    popupOpen,
    connectionDetails,
    existingOrRefreshConnectionDetails,
    appConfig.isPreConnectBufferEnabled,
  ]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!resizeOriginRef.current) return;
      const { width, height, startX, startY, corner } = resizeOriginRef.current;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const minWidth = 280;
      const minHeight = 240;
      const maxWidth = Math.min(520, window.innerWidth - 24);
      const maxHeight = Math.min(720, window.innerHeight - 24);

      const nextWidth =
        corner.includes('w') ? width - deltaX : width + deltaX;
      const nextHeight =
        corner.includes('n') ? height - deltaY : height + deltaY;

      setPanelSize({
        width: Math.max(minWidth, Math.min(maxWidth, Math.round(nextWidth))),
        height: Math.max(minHeight, Math.min(maxHeight, Math.round(nextHeight))),
      });
    };

    const onUp = () => {
      resizeOriginRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const startResize =
    (corner: 'se' | 'sw' | 'ne' | 'nw') => (event: React.PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      resizeOriginRef.current = {
        width: panelSize.width,
        height: panelSize.height,
        startX: event.clientX,
        startY: event.clientY,
        corner,
      };
    };

  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <StartAudio label="Start Audio" />

      <Trigger error={error} popupOpen={popupOpen} onToggle={handleTogglePopup} />

      <div ref={dragConstraints} className="pointer-events-none fixed inset-0 z-50">
        <motion.div
          inert={!popupOpen}
          initial={{
            opacity: 0,
            translateY: isMobile ? '100%' : 8,
          }}
          animate={{
            opacity: popupOpen ? 1 : 0,
            translateY: popupOpen ? (isMobile ? '0%' : 0) : isMobile ? '100%' : 8,
          }}
          transition={{
            type: 'spring',
            bounce: 0,
            duration: popupOpen ? (isMobile ? 0.4 : 1) : 0.2,
          }}
          onAnimationStart={handlePanelAnimationStart}
          onAnimationComplete={handlePanelAnimationComplete}
          className={
            isMobile
              ? 'pointer-events-auto fixed bottom-0 left-0 right-0'
              : 'pointer-events-auto fixed right-4 bottom-20 left-4 md:left-auto'
          }
          drag={!isMobile}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={dragConstraints}
          dragMomentum={false}
          dragElastic={0.08}
        >
          <div
            className={
              isMobile
                ? 'bg-bg1 dark:bg-bg2 border-separator1 dark:border-separator2 relative w-full rounded-t-[28px] border-t border-x border-solid drop-shadow-md'
                : 'bg-bg1 dark:bg-bg2 border-separator1 dark:border-separator2 relative ml-auto w-full rounded-[28px] border border-solid drop-shadow-md'
            }
            style={
              isMobile
                ? { height: '33vh' }
                : { width: panelSize.width, height: panelSize.height }
            }
          >
            {isMobile ? (
              <div className="border-separator1 dark:border-separator2 absolute left-0 right-0 top-0 z-10 flex h-8 items-center justify-between border-b border-solid px-4">
                <div className="h-1 w-10 rounded-full bg-fg4/40" />
                <button
                  type="button"
                  aria-label="Close concierge"
                  onClick={handleTogglePopup}
                  className="flex size-6 items-center justify-center rounded-full text-fg3 hover:text-fg1"
                >
                  <XIcon size={14} weight="bold" />
                </button>
              </div>
            ) : (
              <div
                className="border-separator1 dark:border-separator2 absolute left-0 right-0 top-0 z-10 flex h-8 items-center justify-between border-b border-solid px-4 text-[10px] uppercase tracking-[0.3em] text-fg3"
                onPointerDown={(event) => dragControls.start(event)}
                role="button"
                tabIndex={0}
                aria-label="Drag concierge panel"
              >
                <span>Concierge</span>
                <span className="text-fg4">Drag</span>
              </div>
            )}
            {!isMobile && (
              <>
                <button
                  type="button"
                  aria-label="Resize panel"
                  onPointerDown={startResize('se')}
                  className="absolute bottom-2 right-2 z-20 h-4 w-4 cursor-nwse-resize rounded-full border border-separator1 bg-bg2/80"
                />
                <button
                  type="button"
                  aria-label="Resize panel"
                  onPointerDown={startResize('sw')}
                  className="absolute bottom-2 left-2 z-20 h-4 w-4 cursor-nesw-resize rounded-full border border-separator1 bg-bg2/80"
                />
                <button
                  type="button"
                  aria-label="Resize panel"
                  onPointerDown={startResize('ne')}
                  className="absolute top-10 right-2 z-20 h-4 w-4 cursor-nesw-resize rounded-full border border-separator1 bg-bg2/80"
                />
                <button
                  type="button"
                  aria-label="Resize panel"
                  onPointerDown={startResize('nw')}
                  className="absolute top-10 left-2 z-20 h-4 w-4 cursor-nwse-resize rounded-full border border-separator1 bg-bg2/80"
                />
              </>
            )}
            <div className="relative h-full w-full pt-8">
              <ErrorMessage error={error} />
              {!error && (
                <PopupViewMotion
                  appConfig={appConfig}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: error === null ? 1 : 0 }}
                  transition={{
                    type: 'linear',
                    duration: 0.2,
                  }}
                  disabled={!popupOpen}
                  sessionStarted={popupOpen}
                  onEmbedError={setError}
                  className="absolute inset-0"
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </RoomContext.Provider>
  );
}

export default AgentClient;
