import React, { useState } from 'react';
import EmojiPicker from 'emoji-picker-react';

const Input = ({ handleSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleInputSend = () => {
    if (newMessage.trim()) {
      handleSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInputSend();
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => prevMessage + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="flex items-center p-2 rounded-r-3xl relative"
      style={{ backgroundColor: '#222831' }}
    >
      <button
        className="text-[#FFD369] text-2xl mr-2"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      >
        <img src="/face_icon.svg" alt="face_icon" />    
      </button>
      {showEmojiPicker && (
        <div className="absolute bottom-full left-0 z-10 bg-white border border-gray-300 rounded-lg shadow-lg">
          <EmojiPicker onEmojiClick={onEmojiClick} />
        </div>
      )}
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message here"
        className="flex-1 bg-[#3C3C3C] text-white p-2 rounded-2xl rounded-tr-none rounded-bl-none border border-gray-600 mr-2"
      />
      <button
        onClick={handleInputSend}
        className="text-gray-800 px-2 rounded-lg"
      >
        <img src="/send_msg.svg" alt="send_msg" />
      </button>
    </div>
  );
};

export default Input;
