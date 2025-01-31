from channels.generic.websocket import AsyncJsonWebsocketConsumer
import asyncio
from typing import Dict, Tuple
import time
from .tournament_manager import TournamentManager
import random
from django.utils import timezone
from .handlePlayMsg import handle_play_msg
from .handdlePaddleCanvas import handle_paddle_msg, handle_canvas_resize
from channels.db import database_sync_to_async
from .models import GameResult
from django.contrib.auth import get_user_model




class GameConsumer(AsyncJsonWebsocketConsumer):
    # Existing classic game attributes, read more about typing in python
    waiting_players: Dict[int, Tuple[str, str, str]] = {}
    channel_to_room: Dict[str, str] = {}
    rooms: Dict[str, list] = {}
    games = {}
    lock = asyncio.Lock()
    games_tasks: Dict[str, asyncio.Task] = {} 
    _tournament_manager = None
    # Single tournament manager instance
    @classmethod
    def get_tournament_manager(cls):
        if cls._tournament_manager is None:
            cls._tournament_manager = TournamentManager()
        return cls._tournament_manager

    tournament_confirmations = {}  
    confirmation_tasks = {}
    confirmation_locks = {}

    
    
    @database_sync_to_async
    def save_game_result(self, user, opponent, user_score, opponent_score):
        
        try:
            game_result = GameResult.objects.create(  
                user=user.username,
                opponent=opponent,
                userScore=user_score,
                opponentScore=opponent_score,
                user_image=user.image,
            )   
            opponent_obj = get_user_model().objects.get(username=opponent)
            game_result.opponent_image = opponent_obj.image
            user_obj = get_user_model().objects.get(username=user)
            # Add the game result to both users' match history
            user_obj.match_history.add(game_result)
            opponent_obj.match_history.add(game_result)

            game_result.save()
            # Save the user objects
            user_obj.save()
            opponent_obj.save()
            return True
        except Exception as e:
            print(f"Error saving game result:00 {e}")
            return False
    
     
    def __init__(self, *args, **kwargs):        
        super().__init__(*args, **kwargs)
        self.room_name = None
        self.player_id = None
        self.waiting_player_id = None
        self.waiting_player_name = None
        self.waiting_player_img = None
        self.waiting_player_channel = None
        self.isReload = False
        self.canvas_width = None
        self.canvas_height = None

    async def stop_game_loop(self, room_name):
        if room_name in self.games:
            del self.games[room_name]
        if room_name in self.games_tasks:
            
            task = self.games_tasks[room_name]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                del self.games_tasks[room_name]
        

    async def game_loop(self, room_name):
        try:
            target_fps = 60
            target_frame_time = 1.0 / target_fps
            
            while room_name in self.games:
                loop_start_time = time.time()
                game = self.games[room_name]
                
                # Check for game over
                if game.isOver:
                    # Instead of stopping the game loop here, send a game_over message
                    await self.channel_layer.send(
                        self.channel_name,
                        {
                            'type': 'game_over_internal',
                            'scores': {
                                'scoreL': game.scoreL,
                                'scoreR': game.scoreR
                            },
                        }
                    )
                    return 
                    
                game_state = game.update()
                
                # Handle scoring
                if game_state['scored']:
                    game.ball['x'] = game.canvas['width'] / 2
                    game.ball['y'] = game.canvas['height'] / 2
                    game.ball['vx'] = 3 * (1 if game_state['scored'] == 'right' else -1)
                    game.ball['vy'] = (random.random() - 1.5) * 2
                    game.ball['radius'] = 13
                
                await self.channel_layer.group_send(
                    room_name,
                    {
                        'type': 'ball_positions',
                        'ball': game_state['ball'],
                        'paddles': game_state['paddles'],
                        'scored': game_state['scored'],
                        'loser': self.scope["user"].username,
                        'canvas_width': game.canvas['width'],
                    }
                )
                
                process_time = time.time() - loop_start_time
                sleep_time = max(0, target_frame_time - process_time)
                await asyncio.sleep(sleep_time)
                
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"Error in game loop: {e}")
            if room_name in self.games:
                del self.games[room_name]
    
    async def connect(self):
        try:
            user = self.scope["user"]
            if not user.is_authenticated:
                await self.close()
                return
            
            self.player_id = user.id
            await self.accept()
        except Exception as e:
            print(f"Error in connection: {str(e)}")
            await self.close()

    async def tournament_update(self, event):
        """
        Handle tournament update messages and forward them to the client
        """
        # Forward the message data directly to the client
        await self.send_json(event)

    async def receive_json(self, content):
        try:
            message_type = content.get('type')
            if message_type == 'play':
                await handle_play_msg(self, content)

            elif message_type == 'PaddleLeft_move':
                await handle_paddle_msg(self, content)

            elif message_type == 'canvas_resize':
                await handle_canvas_resize(self, content)

            elif message_type == 'reload_detected':
                self.isReload = True

                if self.room_name in self.games:
                    self.games[self.room_name].isReload = True
                    room_players = self.__class__.rooms[self.room_name]
                    opponent = next(
                        (player for player in room_players if player["channel_name"] != self.channel_name),
                        None
                    )
                    if opponent:
                        await self.channel_layer.send(
                            opponent["channel_name"],
                            {
                                'type': 'reloading',
                                'message': f"{content.get('playerName')} has left the game",
                                'reason': 'reload'
                            }
                        )
            elif message_type == 'game_over':
                try:
                    async with GameConsumer.lock:     
                        self.room_name = GameConsumer.channel_to_room.get(self.channel_name)
                        if self.room_name:
                            
                            game = self.games.get(self.room_name)
                            if game:
                                room_players = self.__class__.rooms.get(self.room_name, [])
                                if len(room_players) == 2:
                                    left_player = next(p for p in room_players if p["id"] == min(p["id"] for p in room_players))
                                    right_player = next(p for p in room_players if p["id"] == max(p["id"] for p in room_players))
                                    
                                    opponent = next(p for p in room_players if p["id"] != self.scope["user"].id)
                                    opponent_username = opponent["username"]  # Assuming the name field contains the username

                                    # Save game result
                                    await self.save_game_result(
                                        user=self.scope["user"],
                                        opponent=opponent_username,
                                        user_score=game.scoreL if self.scope["user"].id == left_player["id"] else game.scoreR,
                                        opponent_score=game.scoreR if self.scope["user"].id == left_player["id"] else game.scoreL
                                    )
 
                            if self.room_name in self.games:
                                self.games[self.room_name].isReload = True
                            await self.stop_game_loop(self.room_name)
                        else:
                            print("WAITING ROOM IS EMPTY")
                except Exception as e:
                    print(f"Error in game_over: {e}")
                    await self.send_json({
                        'type': 'error',
                        'message': 'Error in game_over'
                    })

            # <<<<<<<<<<<<<<<<<<<<< Tournament messages >>>>>>>>>>>>>>>>>>>>>

            elif message_type == 'tournament':
                user = self.scope['user']
                user = await self.get_fresh_user_data(user.id)
                if not user:
                    await self.send_json({
                        'type': 'error',
                        'message': 'Could not fetch user data'
                    })
                    return
                mapNum = content.get('mapNum', 1)
                tournament_manager = self.get_tournament_manager()
                response = await tournament_manager.add_player(
                    user.id,
                    self.channel_name,
                    {
                        'name': user.first_name or user.username,
                        'img': user.image,
                        'mapNum': mapNum
                    }
                )
                await self.send_json(response)
            elif message_type == 'tournament_game_start':
                await handle_play_msg(self, content.get('content'))

            elif message_type == 't_match_end':
                winner_name = content.get('winner_name')
                tournament_manager = self.get_tournament_manager()
                winner_id = await tournament_manager.get_player_id(winner_name)
                match_id = content.get('match_id')
                leaver = content.get('leaver')
                if not winner_id or not match_id:
                    await self.send_json({
                        'type': 'error',
                        'message': 'Invalid match data'
                    })
                    return
                await tournament_manager.end_match(match_id, winner_id, leaver)

            elif message_type == 'tournament_cancel':
                async with self.lock:
                    tournament_manager = self.get_tournament_manager()
                    response = await tournament_manager.remove_player(self.player_id)
                    await self.send_json(response)
            elif message_type == "confirming":
                room_name = content.get('room_name')
                tournament_manager = self.get_tournament_manager()
                tournament_id = tournament_manager.get_tournament_id_from_room(room_name)
                
                if tournament_id:
                    await self.handle_player_confirmation(tournament_id)

        except Exception as e:
            print(f"Error in receive_json: {str(e)}")
            await self.send_json({
                'type': 'error',
                'message': 'Error in receive json'
            })

    async def disconnect(self, close_code):
        try:
            async with GameConsumer.lock:
                
                # Handle tournament disconnects first
                if hasattr(self, 'tournament_manager'):
                    tournament_manager = self.get_tournament_manager()
                    room_id = tournament_manager.find_player_pre_match(self.player_id)
                    if room_id:
                        await tournament_manager.remove_player(self.player_id)

                # Clean up waiting_players
                if self.player_id in GameConsumer.waiting_players:
                    del GameConsumer.waiting_players[self.player_id]

                # Get room_name from channel mapping
                room_name = GameConsumer.channel_to_room.get(self.channel_name)
                
                if room_name:
                    await self.stop_game_loop(room_name)

                    # Clean up rooms and notify other player
                    if room_name in GameConsumer.rooms:
                        room_players = GameConsumer.rooms[room_name]
                        remaining_player = next(
                            (player for player in room_players if player["id"] != self.player_id),
                            None
                        )
                        
                        if remaining_player:
                            GameConsumer.waiting_players[remaining_player["id"]] = (
                                remaining_player["channel_name"],
                                remaining_player["name"],
                                remaining_player["img"]
                            )
                            
                            # Clean up channel mappings
                            if self.channel_name in GameConsumer.channel_to_room:
                                del GameConsumer.channel_to_room[self.channel_name]
                            if remaining_player["channel_name"] in GameConsumer.channel_to_room:
                                del GameConsumer.channel_to_room[remaining_player["channel_name"]]

                        # Clean up the room
                        del GameConsumer.rooms[room_name]
                        
                    await self.channel_layer.group_discard(room_name, self.channel_name)
        except Exception as e:
            print(f"[disconnect] Error: {str(e)}")

    async def reloading(self, event):
        await self.send_json({
            'type': 'reloading',
            'message': event['message'],
            'reason': event['reason']
        })

    async def paddle_update(self, event):
        await self.send_json({
            'type': 'score_update',
            'scores': event['scores'],
            'is_complete': event['is_complete'],
            'winner_id': event.get('winner_id')
        })

    async def ball_positions(self, event):
        await self.send_json({
            'type': 'ball_positions',
            'ball': event['ball'],
            'paddles': event['paddles'],
            'scored': event['scored'],
            'loser' : event['loser'],
            'canvas_width': event['canvas_width'],
        })
        
    async def player_paired(self, event):
        self.room_name = event.get('room_name')
        await self.send_json({
            'type': 'player_paired',
            'message': event['message'],
            'player1_name': event['player1_name'],
            'player1_img': event['player1_img'],
            'player2_name': event['player2_name'],
            'player2_img': event['player2_img'],
            'left_player': event['left_player'],
            'right_player': event['right_player'],
        })


    async def right_positions(self, event):
        await self.send_json({
            'type': 'right_positions',
            'y_right': event['y_right'],
        })
    
    
    async def send_countdown(self, total_time=3):
        try:
            # Check if room_name exists
            if not self.room_name:
                await self.send_json({
                    'type': 'error',
                    'message': 'No room available for countdown'
                })
                return

            for remaining_time in range(total_time, -1, -1):
                # Check if room still exists before each iteration
                if self.room_name not in GameConsumer.rooms:
                    await self.send_json({
                        'type': 'error',
                        'message': 'Room no longer available'
                    })
                    return

                min, secs = divmod(remaining_time, 60)
                timeformat = '{:02d}'.format(secs)

                await self.channel_layer.group_send(
                    self.room_name,
                    {
                        'type': 'countdown',
                        'time_remaining': timeformat,
                        'is_finished': remaining_time == 0,
                    }
                )
                await asyncio.sleep(1)

        except Exception as e:
            print(f"COUNTDOWN ERROR: {e}")
            await self.send_json({
                'type': 'error',
                'message': f'Countdown error: {str(e)}'
            })
    
    async def countdown(self, event):
        await self.send_json({
            'type': 'countdown',
            'time_remaining': event['time_remaining'],
            'is_finished': event.get('is_finished', False),
        })
    
    async def tournament_error(self, event):
        """Handle tournament error message"""
        await self.send_json({
            'type': 'error',
            'message': event['message']
        })

    async def game_over_internal(self, event):
        try:
            async with GameConsumer.lock:
                self.room_name = GameConsumer.channel_to_room.get(self.channel_name)
                if not self.room_name:
                    return
                    
                game = self.games.get(self.room_name)
                if not game:
                    return
                    
                room_players = self.__class__.rooms.get(self.room_name, [])
                if len(room_players) != 2:
                    return
                    
                # Get player positions
                left_player = next(p for p in room_players if p["id"] == min(p["id"] for p in room_players))
                right_player = next(p for p in room_players if p["id"] == max(p["id"] for p in room_players))
                
                # Get opponent info
                opponent = next(p for p in room_players if p["id"] != self.scope["user"].id)
                opponent_username = opponent["username"]
                
                # Calculate scores
                is_left = self.scope["user"].id == left_player["id"]
                user_score = game.scoreL if is_left else game.scoreR
                opponent_score = game.scoreR if is_left else game.scoreL
                
                # Save game result
                try:
                    await self.save_game_result(
                        user=self.scope["user"],
                        opponent=opponent_username,
                        user_score=user_score,
                        opponent_score=opponent_score
                    )
                except Exception as e:
                    print(f"Error saving game result:11 {e}")
                
                # Now we can safely clean up
                if self.room_name in self.games:
                    self.games[self.room_name].isReload = True
                await self.stop_game_loop(self.room_name)
                
        except Exception as e:
            print(f"Error in game_over_internal handler: {e}")

    # Modified receive_json handler for game_over
    async def handle_game_over(self, content):
        try:
            async with GameConsumer.lock:
                if self.room_name in self.games:
                    self.games[self.room_name].isOver = True
                else:
                    print("Game already ended")
        except Exception as e:
            print(f"Error handling game over: {e}")

    async def handle_player_confirmation(self, tournament_id: str):
        try:
            player_id = self.scope["user"].id

            if tournament_id not in self.confirmation_locks:
                self.confirmation_locks[tournament_id] = asyncio.Lock()

            async with self.confirmation_locks[tournament_id]:
                if tournament_id not in self.tournament_confirmations:
                    self.tournament_confirmations[tournament_id] = set()
                    self.confirmation_tasks[tournament_id] = asyncio.create_task(
                        self.check_tournament_confirmations(tournament_id)
                    )

                self.tournament_confirmations[tournament_id].add(player_id)
                print(f"Player {player_id} confirmed for tournament {tournament_id}")
                print(f"Current confirmations: {self.tournament_confirmations[tournament_id]}")

        except Exception as e:
            print(f"Error handling player confirmation: {e}")

    async def check_tournament_confirmations(self, tournament_id: str):
        try:
            # Store bracket reference - Use .get() instead of []
            tournament_manager = self.get_tournament_manager()
            bracket = tournament_manager.tournament_brackets.get(tournament_id)
            if not bracket:
                print(f"No bracket found for tournament {tournament_id}")
                await tournament_manager.cancel_tournament(tournament_id)
                return

            # Get expected players based on whether it's finals or semifinals
            expected_players = set()
            
            # Check if this is a final match
            if bracket['final_match'] and bracket['final_match'].get('players'):
                # For finals, only check the two finalists
                for player in bracket['final_match']['players']:
                    expected_players.add(player['id'])
            else:
                # For semifinals, check all players in regular matches
                for match in bracket['matches']:
                    for player in match['players']:
                        expected_players.add(player['id'])
            
            await asyncio.sleep(2.5)

            async with self.confirmation_locks[tournament_id]:
                confirmed_players = self.tournament_confirmations.get(tournament_id, set())
                if not confirmed_players.issuperset(expected_players):
                    missing_players = expected_players - confirmed_players
                    await tournament_manager.cancel_tournament(tournament_id)

        except Exception as e:
            print(f"Error checking tournament confirmations: {str(e)}")
            try:
                await tournament_manager.cancel_tournament(tournament_id)
            except Exception as cancel_error:
                print(f"Error canceling tournament: {str(cancel_error)}")
        finally:
            # Cleanup
            async with self.confirmation_locks[tournament_id]:
                if tournament_id in self.tournament_confirmations:
                    del self.tournament_confirmations[tournament_id]
                if tournament_id in self.confirmation_tasks:
                    del self.confirmation_tasks[tournament_id]
                if tournament_id in self.confirmation_locks:
                    del self.confirmation_locks[tournament_id]

    @database_sync_to_async
    def get_fresh_user_data(self, user_id):
        """
        Fetch fresh user data from the database
        """
        try:
            return get_user_model().objects.get(id=user_id)
        except get_user_model().DoesNotExist:
            return None