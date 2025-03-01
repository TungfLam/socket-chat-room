const socketIO = require("socket.io");

let io;
const rooms = new Set();

const initSockets = (server) => {
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  
  io.on("connection", (socket) => {
    console.log(`👤 Người dùng kết nối: ${socket.id}`);
    console.log("🚀 ~ rooms:", rooms)

    socket.emit("room-list", Array.from(rooms));

    socket.on("join-room", (room) => {
      const roomFormat = room.trim(); 
      const existingRooms = Array.from(socket.rooms);

      if (existingRooms.length > 1) {
        socket.emit("join-room-response", {
          status: 0,
          message:
            "❌ Bạn đã tham gia một phòng rồi. Vui lòng rời phòng trước khi tham gia phòng mới.",
        });
        return;
      }

      socket.join(roomFormat);
      rooms.add(roomFormat);
      console.log(`📢 ${socket.id} tham gia phòng: ${roomFormat}`);

      socket.emit("join-room-response", {
        status: 1,
        message: `✅ Tham gia phòng ${roomFormat} thành công!`,
      });
      io.to(roomFormat).emit("message", `👋 ${socket.id} đã tham gia phòng!`);
      // Cập nhật danh sách phòng
      updateRoomUsers(roomFormat);
    });

    socket.on("chat-message", ({ room, message }) => {
      console.log(
        `💬 Tin nhắn từ ${socket.id} trong phòng ${room}: ${message}`
      );
      io.to(room).emit("chat-message", { sender: socket.id, message });
    });

    socket.on("leave-room", (room) => {
      if (!room) {
        console.log(`⚠️ Không xác định được phòng.`);
        return;
      }
      delete socket.data.currentRoom;
      socket.leave(room);
      console.log(`❌ ${socket.id} rời khỏi phòng: ${room}`);

      // Kiểm tra nếu phòng trống, xóa phòng
      const clientsInRoom = io.sockets.adapter.rooms.get(room);
      if (!clientsInRoom || clientsInRoom.size === 0) {
        rooms.delete(room);
        console.log(`🗑️ Phòng '${room}' đã bị xóa do không còn người.`);
      }
      io.to(room).emit("message", `❌ ${socket.id} đã rời phòng!`);
      updateRoomUsers();
    });

    // Reload trang
    socket.on("reload-request", () => {
      if (socket.data.currentRoom) {
        socket.emit("reload-response", socket.data.currentRoom);
      }
    });

    socket.on("disconnect", () => {
      const room = socket.data.currentRoom;
      if (room) {
        console.log(`🔌 ${socket.id} ngắt kết nối từ phòng: ${room}`);
        delete socket.data.currentRoom;
        updateRoomUsers();
      }
    });
  });
};

// Cập nhật số người trong phòng
function updateRoomUsers() {
  io.emit(
    "room-list",
    Array.from(rooms).map((roomName) => ({
      name: roomName,
      userCount: io.sockets.adapter.rooms.get(roomName)?.size || 0,
    }))
  );
}

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

module.exports = {
  initSockets,
  getIO,
};
