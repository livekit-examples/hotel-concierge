import json
import logging
from typing import Any

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    inference,
    function_tool,
    RunContext,
    room_io,
)
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("agent")

load_dotenv(".env.local")

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a helpful voice AI assistant. The user is interacting with you via voice, even if you perceive the conversation as text.
            You eagerly assist users with their questions by providing information from your extensive knowledge.
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.
            You can control the hotel website using the available function tools to navigate, scroll, and update booking details.

            Hotel room inventory (only these rooms exist):
            - Harbor Suite (id: harbor-suite)
            - Gallery Loft (id: gallery-loft)
            - Terrace Residence (id: terrace-residence)
            - Lighthouse Penthouse (id: lighthouse-penthouse)

            When you need to select or reference a room, use these exact names and ids.
            Never invent room names or ids.

            Tools available for website control:
            - hotel_open_booking()
            - hotel_select_room(room_id)
            - hotel_set_booking_dates(check_in, check_out)
            - hotel_set_booking_guests(guests)
            - hotel_set_booking_contact(name, email, phone, special_requests)
            - hotel_set_booking_address(address_line1, address_line2, city, region, postal_code, country)
            - hotel_set_booking_preferences(arrival_time, bed_preference, occasion, accessibility, special_requests)
            - hotel_confirm_booking()
            - hotel_check_availability(room_id=None)
            - hotel_scroll_to(element_id=None, y=None, behavior="smooth")
            - hotel_navigate(path, replace=False)

            When the customer wants to book, navigate to /booking using hotel_open_booking or hotel_navigate.
            Then fill in the booking form fields using the booking tools.
            Use these exact arrival time options:
            - Before 12:00 PM
            - 12:00 PM - 3:00 PM
            - 3:00 PM - 6:00 PM
            - After 6:00 PM

            If the customer asks for more details about a specific room, move to the room page using hotel_navigate(path, replace=True).
            This will show them the room page with all of the room's details. Then, you should tell them the details about the room.

            Website sitemap (allowed paths only):
            - /
            - /booking
            - /rooms
            - /suites/harbor-suite
            - /suites/gallery-loft
            - /suites/terrace-residence
            - /suites/lighthouse-penthouse
            - /amenities/gym
            - /amenities/spa
            - /amenities/rooftop
            - /amenities/lounge
            - /dining/verdant-kitchen
            - /dining/brass-ember
            - /dining/atrium-bar
            - /experiences
            - /offers

            Only navigate to the paths listed above. Do not navigate anywhere else.
            """,
        )

    async def _perform_rpc(
        self,
        context: RunContext,
        method: str,
        payload: dict[str, Any] | None = None,
    ) -> str:
        try:
            room = context.session.room_io.room
        except Exception as exc:
            logger.error("Room IO not ready for RPC", exc_info=exc)
            return "No active room connection."

        participant = context.session.room_io.linked_participant
        if participant is None and room.remote_participants:
            participant = next(iter(room.remote_participants.values()))

        if participant is None:
            return "No connected frontend participant."

        try:
            response = await room.local_participant.perform_rpc(
                destination_identity=participant.identity,
                method=method,
                payload=json.dumps(payload or {}),
            )
            return response
        except Exception as exc:
            logger.error("RPC failed", exc_info=exc)
            return f"RPC failed: {exc}"

    @function_tool
    async def hotel_open_booking(self, context: RunContext) -> str:
        """Open the booking page in the hotel site."""

        return await self._perform_rpc(context, "hotel.open_booking")

    @function_tool
    async def hotel_select_room(self, context: RunContext, room_id: str) -> str:
        """Select a specific room and open booking availability.

        Args:
            room_id: Room ID slug, e.g. "harbor-suite".
        """

        return await self._perform_rpc(
            context, "hotel.select_room", {"roomId": room_id}
        )

    @function_tool
    async def hotel_set_booking_dates(
        self,
        context: RunContext,
        check_in: str | None = None,
        check_out: str | None = None,
    ) -> str:
        """Set booking dates (YYYY-MM-DD)."""

        payload: dict[str, Any] = {}
        if check_in:
            payload["checkIn"] = check_in
        if check_out:
            payload["checkOut"] = check_out
        return await self._perform_rpc(context, "hotel.set_booking_dates", payload)

    @function_tool
    async def hotel_set_booking_guests(self, context: RunContext, guests: int) -> str:
        """Set number of guests for booking."""

        return await self._perform_rpc(
            context, "hotel.set_booking_guests", {"guests": guests}
        )

    @function_tool
    async def hotel_set_booking_contact(
        self,
        context: RunContext,
        name: str | None = None,
        email: str | None = None,
        phone: str | None = None,
        special_requests: str | None = None,
    ) -> str:
        """Set booking contact details for the form."""

        payload: dict[str, Any] = {}
        if name:
            payload["name"] = name
        if email:
            payload["email"] = email
        if phone:
            payload["phone"] = phone
        if special_requests:
            payload["specialRequests"] = special_requests
        return await self._perform_rpc(context, "hotel.set_booking_contact", payload)

    @function_tool
    async def hotel_set_booking_address(
        self,
        context: RunContext,
        address_line1: str | None = None,
        address_line2: str | None = None,
        city: str | None = None,
        region: str | None = None,
        postal_code: str | None = None,
        country: str | None = None,
    ) -> str:
        """Set guest address details for the booking form."""

        payload: dict[str, Any] = {}
        if address_line1:
            payload["addressLine1"] = address_line1
        if address_line2:
            payload["addressLine2"] = address_line2
        if city:
            payload["city"] = city
        if region:
            payload["region"] = region
        if postal_code:
            payload["postalCode"] = postal_code
        if country:
            payload["country"] = country
        return await self._perform_rpc(context, "hotel.set_booking_address", payload)

    @function_tool
    async def hotel_set_booking_preferences(
        self,
        context: RunContext,
        arrival_time: str | None = None,
        bed_preference: str | None = None,
        occasion: str | None = None,
        accessibility: str | None = None,
        special_requests: str | None = None,
    ) -> str:
        """Set booking preferences such as arrival time, bed preference, and occasion."""

        payload: dict[str, Any] = {}
        if arrival_time:
            payload["arrivalTime"] = arrival_time
        if bed_preference:
            payload["bedPreference"] = bed_preference
        if occasion:
            payload["occasion"] = occasion
        if accessibility:
            payload["accessibility"] = accessibility
        if special_requests:
            payload["specialRequests"] = special_requests
        return await self._perform_rpc(
            context, "hotel.set_booking_preferences", payload
        )

    @function_tool
    async def hotel_confirm_booking(self, context: RunContext) -> str:
        """Click the confirm booking button on the booking page."""

        return await self._perform_rpc(context, "hotel.confirm_booking")

    @function_tool
    async def hotel_check_availability(
        self, context: RunContext, room_id: str | None = None
    ) -> str:
        """Check availability with current booking dates and guest count."""

        payload = {"roomId": room_id} if room_id else {}
        return await self._perform_rpc(
            context, "hotel.check_availability", payload
        )

    @function_tool
    async def hotel_scroll_to(
        self,
        context: RunContext,
        element_id: str | None = None,
        y: int | None = None,
        behavior: str | None = "smooth",
    ) -> str:
        """Scroll the page to a section id or y-position."""

        payload: dict[str, Any] = {}
        if element_id:
            payload["id"] = element_id
        if y is not None:
            payload["y"] = y
        if behavior:
            payload["behavior"] = behavior
        return await self._perform_rpc(context, "hotel.scroll_to", payload)

    @function_tool
    async def hotel_navigate(
        self, context: RunContext, path: str, replace: bool = False
    ) -> str:
        """Navigate to a hotel site path (e.g. /rooms)."""

        return await self._perform_rpc(
            context, "hotel.navigate", {"path": path, "replace": replace}
        )

    # To add tools, use the @function_tool decorator.
    # Here's an example that adds a simple weather tool.
    # You also have to add `from livekit.agents import function_tool, RunContext` to the top of this file
    # @function_tool
    # async def lookup_weather(self, context: RunContext, location: str):
    #     """Use this tool to look up current weather information in the given location.
    #
    #     If the location is not supported by the weather service, the tool will indicate this. You must tell the user the location's weather is unavailable.
    #
    #     Args:
    #         location: The location to look up weather information for (e.g. city name)
    #     """
    #
    #     logger.info(f"Looking up weather for {location}")
    #
    #     return "sunny with a temperature of 70 degrees."


server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="hotel-agent")
async def my_agent(ctx: JobContext):
    # Logging setup
    # Add any other context you want in all log entries here
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    # Set up a voice AI pipeline using OpenAI, Cartesia, AssemblyAI, and the LiveKit turn detector
    session = AgentSession(
        # Speech-to-text (STT) is your agent's ears, turning the user's speech into text that the LLM can understand
        # See all available models at https://docs.livekit.io/agents/models/stt/
        stt=inference.STT(model="assemblyai/universal-streaming", language="en"),
        # A Large Language Model (LLM) is your agent's brain, processing user input and generating a response
        # See all available models at https://docs.livekit.io/agents/models/llm/
        llm=inference.LLM(model="openai/gpt-4.1-mini"),
        # Text-to-speech (TTS) is your agent's voice, turning the LLM's text into speech that the user can hear
        # See all available models as well as voice selections at https://docs.livekit.io/agents/models/tts/
        tts="elevenlabs/eleven_turbo_v2_5:cgSgspJ2msm6clMCkdW9",
        # VAD and turn detection are used to determine when the user is speaking and when the agent should respond
        # See more at https://docs.livekit.io/agents/build/turns
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        # allow the LLM to generate a response while waiting for the end of turn
        # See more at https://docs.livekit.io/agents/build/audio/#preemptive-generation
        preemptive_generation=True,
    )

    # To use a realtime model instead of a voice pipeline, use the following session setup instead.
    # (Note: This is for the OpenAI Realtime API. For other providers, see https://docs.livekit.io/agents/models/realtime/))
    # 1. Install livekit-agents[openai]
    # 2. Set OPENAI_API_KEY in .env.local
    # 3. Add `from livekit.plugins import openai` to the top of this file
    # 4. Use the following session setup instead of the version above
    # session = AgentSession(
    #     llm=openai.realtime.RealtimeModel(voice="marin")
    # )

    # # Add a virtual avatar to the session, if desired
    # # For other providers, see https://docs.livekit.io/agents/models/avatar/
    # avatar = hedra.AvatarSession(
    #   avatar_id="...",  # See https://docs.livekit.io/agents/models/avatar/plugins/hedra
    # )
    # # Start the avatar and wait for it to join
    # await avatar.start(session, room=ctx.room)

    # Start the session, which initializes the voice pipeline and warms up the models
    await session.start(
        agent=Assistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony()
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                else noise_cancellation.BVC(),
            ),
        ),
    )

    # Join the room and connect to the user
    await ctx.connect()

    # Send an explicit first-turn greeting as soon as the agent is connected.
    await session.generate_reply(
        instructions=(
            'Say exactly: "Thanks for considering our hotel, do you have '
            'any questions I can answer?"'
        )
    )


if __name__ == "__main__":
    cli.run_app(server)
