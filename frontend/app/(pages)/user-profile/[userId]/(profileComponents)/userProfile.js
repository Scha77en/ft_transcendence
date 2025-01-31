"use client";

import React from "react";
import FriendsInfo from "../../friends/FriendInfo";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Axios from "../../../Components/axios";
import toast from "react-hot-toast";
import { useWebSocketContext } from "../../../Components/WebSocketContext";

const UserProfile = () => {
  const { userId } = useParams();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const [FriendshipStatu, setFriendshipStatu] = useState(null);
  const { sendGameRequest } = useWebSocketContext();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await Axios.get(`/api/users/${userId}/`);
        setUserData(response.data.data);
        const userResponse = await Axios.get("/api/user_profile/");
        setCurrentUserId(userResponse.data.id);

        const friendshipResponse = await Axios.get(
          `/api/friends/friendship_status/${userId}/`
        );
        setFriendshipStatu(friendshipResponse.data);
      } catch (err) {
        setError(err.response?.data?.message || "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    toast.error(error);
  }

  const sendFriendRequest = async (userId) => {
    if (String(userId) === String(currentUserId)) {
      toast.error("Cannot send friend request to yourself");
      return;
    }
    if (FriendshipStatu.can_send_request === true) {
      try {
        const response = await Axios.post(
          `/api/friends/send_friend_request/${userId}/`
        );
        await friendshipStatus(userId);
        toast.success("Friend request sent successfully");
      } catch (err) {
        if (err.response?.data?.error) {
          toast.error(err.response.data.error);
        }
      }
    } else {
      toast.error("Cannot send friend request");
    }
  };

  const friendshipStatus = async (userId) => {
    try {
      const response = await Axios.get(
        `/api/friends/friendship_status/${userId}/`
      );
      setFriendshipStatu(response.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

  const friendRequests = async (userId) => {
    try {
      const response = await Axios.get(`/api/friends/friend_requests/`);
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

  const blockUser = async (userId) => {
    if (String(userId) === String(currentUserId)) {
      toast.error("Cannot block yourself");
      return;
    }
    try {
      // Check if user is already blocked
      if (FriendshipStatu?.is_blocked) {
        toast.error("User is already blocked");
        return;
      }

      const response = await Axios.post(`/api/friends/block_user/${userId}/`);
      await friendshipStatus(userId);
      toast.success("User blocked successfully");
    } catch (err) {
      // If we get a 400 error but it's because the user is already blocked,
      // we can still show a success message
      if (
        err.response?.status === 400 &&
        err.response?.data?.error === "User is already blocked"
      ) {
        await friendshipStatus(userId);
        toast.success("User is blocked");
      } else if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      }
    }
  };

  const unblockUser = async (userId) => {
    if (String(userId) === String(currentUserId)) {
      toast.error("Cannot unblock yourself");
      return;
    }
    if (FriendshipStatu?.is_blocked === true) {
      try {
        await Axios.post(`/api/friends/unblock_user/${userId}/`);
        await friendshipStatus(userId);
        toast.success("User unblocked successfully");
      } catch (err) {
        if (err.response?.data?.error) {
          toast.error(err.response.data.error);
        }
      }
    } else {
      toast.error("User is not blocked");
    }
  };

  const removeFriendship = async (userId) => {
    if (FriendshipStatu.friendship_status === null) {
      toast.error("No friendship to remove");
      return;
    }
    try {
      const response = await Axios.delete(
        `/api/friends/remove_friendship/${userId}/`
      );
      await friendshipStatus(userId);
      toast.success("Friendship removed successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          sendFriendRequest(userId);
        }}
      >
        Send Friend Request88
      </button>
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          friendshipStatus(userId);
        }}
      >
        Friendship Status
      </button>
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          blockUser(userId);
        }}
      >
        Block User
      </button>
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          unblockUser(userId);
        }}
      >
        Unblock User
      </button>
      {/* remove friendship */}
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          removeFriendship(userId);
        }}
      >
        Remove Friendship
      </button>
      {/* send game request */}
      <button
        className="bg-blue-500 m-2 text-white p-2 rounded-md"
        onClick={() => {
          sendGameRequest(userId);
        }}
      >
        Send Game Request
      </button>
      {userData && (
        <FriendsInfo
          friend={userData} // Pass userData as friend prop
          history={[]} // Pass empty history or actual history if available
        />
      )}
    </div>
  );
};

export default UserProfile;
