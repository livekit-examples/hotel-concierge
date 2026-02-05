'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, type RpcInvocationData } from 'livekit-client';
import { motion, useDragControls } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
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

    const getBridge = () =>
      (window as unknown as { LiveHotel?: Record<string, (...args: any[]) => void> })
        .LiveHotel;

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

    const normalizePath = (path: string) => {
      if (path.startsWith('/rooms/')) {
        return `/suites/${path.slice('/rooms/'.length)}`;
      }
      return path;
    };

    room.registerRpcMethod('hotel.navigate', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const rawPath = payload.path;
      if (typeof rawPath !== 'string' || rawPath.length === 0) {
        return err('Missing path');
      }
      const path = normalizePath(rawPath);
      const bridge = getBridge();
      if (bridge?.navigate) {
        bridge.navigate(path, Boolean(payload.replace));
        return ok();
      }
      if (payload.replace) {
        window.location.replace(path);
      } else {
        window.location.assign(path);
      }
      return ok();
    });

    room.registerRpcMethod('hotel.open_booking', async () => {
      const bridge = getBridge();
      if (!bridge?.openBooking) return err('LiveHotel bridge not available');
      bridge.openBooking();
      return ok();
    });

    room.registerRpcMethod('hotel.select_room', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const roomId = payload.roomId;
      const bridge = getBridge();
      if (!bridge?.selectRoom) return err('LiveHotel bridge not available');
      if (typeof roomId !== 'string' || roomId.length === 0) {
        return err('Missing roomId');
      }
      bridge.selectRoom(roomId);
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_dates', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.setBookingDates) return err('LiveHotel bridge not available');
      bridge.setBookingDates({
        checkIn: typeof payload.checkIn === 'string' ? payload.checkIn : undefined,
        checkOut: typeof payload.checkOut === 'string' ? payload.checkOut : undefined,
      });
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_guests', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.setBookingGuests) return err('LiveHotel bridge not available');
      const guests = Number(payload.guests);
      bridge.setBookingGuests(Number.isFinite(guests) ? guests : 1);
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_contact', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.setBookingContact) return err('LiveHotel bridge not available');
      bridge.setBookingContact({
        name: typeof payload.name === 'string' ? payload.name : undefined,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        phone: typeof payload.phone === 'string' ? payload.phone : undefined,
        specialRequests:
          typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined,
      });
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_address', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.setBookingAddress) return err('LiveHotel bridge not available');
      bridge.setBookingAddress({
        addressLine1:
          typeof payload.addressLine1 === 'string' ? payload.addressLine1 : undefined,
        addressLine2:
          typeof payload.addressLine2 === 'string' ? payload.addressLine2 : undefined,
        city: typeof payload.city === 'string' ? payload.city : undefined,
        region: typeof payload.region === 'string' ? payload.region : undefined,
        postalCode: typeof payload.postalCode === 'string' ? payload.postalCode : undefined,
        country: typeof payload.country === 'string' ? payload.country : undefined,
      });
      return ok();
    });

    room.registerRpcMethod('hotel.set_booking_preferences', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.setBookingPreferences) return err('LiveHotel bridge not available');
      bridge.setBookingPreferences({
        arrivalTime:
          typeof payload.arrivalTime === 'string' ? payload.arrivalTime : undefined,
        bedPreference:
          typeof payload.bedPreference === 'string' ? payload.bedPreference : undefined,
        occasion: typeof payload.occasion === 'string' ? payload.occasion : undefined,
        accessibility:
          typeof payload.accessibility === 'string' ? payload.accessibility : undefined,
        specialRequests:
          typeof payload.specialRequests === 'string' ? payload.specialRequests : undefined,
      });
      return ok();
    });

    room.registerRpcMethod('hotel.confirm_booking', async () => {
      const bridge = getBridge();
      if (!bridge?.confirmBooking) return err('LiveHotel bridge not available');
      bridge.confirmBooking();
      return ok();
    });

    room.registerRpcMethod('hotel.check_availability', async (data: RpcInvocationData) => {
      const payload = parsePayload(data.payload);
      const bridge = getBridge();
      if (!bridge?.checkAvailability) return err('LiveHotel bridge not available');
      const roomId = typeof payload.roomId === 'string' ? payload.roomId : undefined;
      bridge.checkAvailability(roomId);
      return ok();
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
            translateY: 8,
          }}
          animate={{
            opacity: popupOpen ? 1 : 0,
            translateY: popupOpen ? 0 : 8,
          }}
          transition={{
            type: 'spring',
            bounce: 0,
            duration: popupOpen ? 1 : 0.2,
          }}
          onAnimationStart={handlePanelAnimationStart}
          onAnimationComplete={handlePanelAnimationComplete}
          className="pointer-events-auto fixed right-4 bottom-20 left-4 md:left-auto"
          drag
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={dragConstraints}
          dragMomentum={false}
          dragElastic={0.08}
        >
          <div
            className="bg-bg1 dark:bg-bg2 border-separator1 dark:border-separator2 relative ml-auto w-full rounded-[28px] border border-solid drop-shadow-md"
            style={{ width: panelSize.width, height: panelSize.height }}
          >
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
