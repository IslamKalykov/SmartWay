import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.trip_id = self.scope["url_route"]["kwargs"]["trip_id"]
        self.room_group_name = f"trip_chat_{self.trip_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get("message", "")
        user = "Аноним"
        scope_user = self.scope.get("user")
        if getattr(scope_user, "is_authenticated", False):
            user = getattr(scope_user, "full_name", str(scope_user)) or "Пользователь"

        await self.channel_layer.group_send(
            self.room_group_name,
            {"type": "chat_message", "message": f"{user}: {message}"}
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"message": event["message"]}))
