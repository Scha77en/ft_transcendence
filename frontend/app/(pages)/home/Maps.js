"use client";
import TournamentBracket from "../Components/TournamentBracket";
import React, { useEffect, useState, useRef } from "react";
import { useWebSocketContext } from "../game/webSocket";
import { useSearchParams, useRouter } from "next/navigation";
import { ResponsiveCarousel, data } from "./Carousel";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import "../../globals.css";
import Axios from "../Components/axios";
import { toast } from "react-hot-toast";

const LinkGroup = ({ activeLink, setActiveLink }) => {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-14 mb-16 ">
      <div className="flex flex-col items-center w-[60%] lg:w-auto hover:shadow-2xl hover:scale-[1.05] hover:text-2xl transition-all">
        <h3 className="text-lg font-semibold text-[#FFD369] mb-2">Local</h3>
        <a
          onClick={() => setActiveLink("local")}
          aria-label="local option"
          className={`bg-[#393E46]  p-6 lg:p-3 rounded-lg h-[170px] lg:h-[100px] w-full lg:w-44 
                      flex justify-center items-center relative group cursor-pointer ${
                        activeLink == "local" ? "border border-[#FFD369]" : ""
                      } `}
        >
          <img
            src="/game_modes/local_game.png"
            alt="Local Game"
            className="h-full"
          />
        </a>
      </div>

      <div className="flex flex-col items-center w-[60%] lg:w-auto hover:shadow-2xl hover:scale-[1.05] hover:text-2xl transition-all">
        <h3 className="text-lg font-semibold text-[#FFD369] mb-2">Classic</h3>
        <a
          onClick={() => setActiveLink("classic")}
          aria-label="classic option"
          className={`bg-[#393E46]  p-6 lg:p-3 rounded-lg h-[170px] lg:h-[100px] w-full lg:w-44 
                      flex justify-center items-center relative group cursor-pointer ${
                        activeLink == "classic" ? "border border-[#FFD369]" : ""
                      } `}
        >
          <img
            src="/game_modes/vs_icon.png"
            alt="Classic Game"
            className="h-full"
          />
        </a>
      </div>

      <div className="flex flex-col items-center w-[60%] lg:w-auto hover:shadow-2xl hover:scale-[1.05] hover:text-2xl transition-all">
        <h3 className="text-lg font-semibold text-[#FFD369] mb-2">
          Tournament
        </h3>
        <a
          onClick={() => setActiveLink("tournament")}
          aria-label="tournament option"
          className={`bg-[#393E46]  p-6 lg:p-3 rounded-lg h-[170px] lg:h-[100px] w-full lg:w-44 
                      flex justify-center items-center relative group cursor-pointer ${
                        activeLink == "tournament"
                          ? "border border-[#FFD369]"
                          : ""
                      } `}
        >
          <img
            src="/game_modes/tournament_icon.png"
            alt="Tournament Game"
            className="h-full"
          />
        </a>
      </div>

      <div className="flex flex-col items-center w-[60%] lg:w-auto hover:shadow-2xl hover:scale-[1.05] hover:text-2xl transition-all">
        <h3 className="text-lg font-semibold text-[#FFD369] mb-2">
          Multi Players
        </h3>
        <a
          onClick={() => setActiveLink("multiPlayer")}
          aria-label="Multi Players option"
          className={`bg-[#393E46]  p-6 lg:p-3 rounded-lg h-[170px] lg:h-[100px] w-full lg:w-48 
                      flex justify-center items-center relative group cursor-pointer ${
                        activeLink == "multiPlayer"
                          ? "border border-[#FFD369]"
                          : ""
                      } `}
        >
          <img
            src="/game_modes/multiPlayers_icon.png"
            alt="Multi Players"
            className="h-full"
          />
        </a>
      </div>
    </div>
  );
};

function Maps() {
  const isIntentionalNavigation = useRef(false);
  const [tournamentWaiting, setTournamentWaiting] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [playerPic, setPlayerPic] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [username, setUsername] = useState(null);
  const [step, setStep] = useState("");
  const searchParams = useSearchParams();
  const [mapNum, setMapNum] = useState(1);
  const [activeImg, setActiveImg] = useState(null);
  const [activeLink, setActiveLink] = useState("classic");
  const {
    gameState,
    tournamentState,
    setGameState,
    sendGameMessage,
    setUser,
    setPlayer1Name,
  } = useWebSocketContext();
  const router = useRouter();

  useEffect(() => {
    // function to fetch the username to send data
    const fetchCurrentUser = async () => {
      try {
        const response = await Axios.get("/api/user_profile/");
        setPlayerPic(response.data.image);
        setPlayerName(response.data.first_name);
        setPlayer1Name(response.data.first_name);
        setUsername(response.data.username);
        setUser(response.data.username);
      } catch (err) {
        toast.error("Failed to fetch user data");
      }
    };

    fetchCurrentUser();
  }, []);

  const redirecting = () => {
    if (activeLink === "classic") {
      window.location.assign(`./game?mapNum=${mapNum}`);
    } else if (activeLink === "local") {
      window.location.assign(`./offlineGame?mapNum=${mapNum}`);
    } else if (activeLink === "multiPlayer") {
      window.location.assign(`./multiplePlayers?mapNum=${mapNum}`);
    }
  };

  // tournament cancel function
  const handleCancel = () => {
    setTournamentWaiting(false);
    setGameState((prev) => ({
      ...prev,
      waitingMsg: "Cancelling tournament...",
      isStart: false,
      count: 0,
    }));
    sendGameMessage({
      type: "tournament_cancel",
    });
  };

  // Handle tournament redirect
  useEffect(() => {
    if (activeLink === "tournament" && gameState.isStart) {
      isIntentionalNavigation.current = true;

      const doRedirect = async () => {
        sessionStorage.setItem('navigatingFromMaps', 'true');
        await new Promise((resolve) => setTimeout(resolve, 100));
        setTournamentWaiting(false);
        const mapToUse = tournamentState.mapNum || 1;
        router.push(
          `./game?mapNum=${mapToUse}&mode=tournament&room_name=${tournamentState.room_name}`
        );
      };

      doRedirect();
    }
  }, [gameState.isStart, mapNum, tournamentState.room_name, activeLink]);

  useEffect(() => {
    const showTournamentModal = searchParams.get("tournament") === "true";
    if (showTournamentModal) {
      setActiveLink("tournament");
      setTournamentWaiting(true);
      setStep("second");
    }
  }, [searchParams]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (tournamentWaiting && !isIntentionalNavigation.current) {
        sessionStorage.setItem('reloaded', 'true');
        sendGameMessage({
          type: "tournament_cancel",
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const isFromGame = sessionStorage.getItem('navigatingFromGame');
    const isReloaded = sessionStorage.getItem('reloaded');
    if (isFromGame && tournamentWaiting && !isIntentionalNavigation.current && isReloaded) {
      sessionStorage.removeItem('navigatingFromGame');
      sessionStorage.removeItem('reloaded');
      isIntentionalNavigation.current = true;
    }
    const data = window.performance.getEntriesByType("navigation")[0]?.type;
    if (isFromGame && data === "reload" && !isIntentionalNavigation.current && isReloaded) {
      window.location.assign("/");
    }

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [tournamentWaiting, isIntentionalNavigation]);

  useEffect(() => {
    if (isWaiting || tournamentWaiting) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
  }, [isWaiting, tournamentWaiting]);

  return (
    <div
      className="min-h-[calc(100vh-104px)] "
      style={{
        backgroundColor: "#222831",
        fontFamily: "Kaisei Decol",
        color: "#FFD369",
      }}
    >
      <div className="a">
        <div className="mb-32 hidden md:block">
          <h1 className="text-2xl flex justify-center font-extralight pt-20 pb-10 tracking-widest">
            Maps Preview
          </h1>
          <ResponsiveCarousel />
        </div>
        <div className="mb-10 md:hidden w-full flex justify-center items-center">
          <h1 className="text-4xl font-extrabold text-[#FFD369] flex justify-center items-center h-20 w-40 rounded-full bg-[#393E46] shadow-2xl   tracking-widest border-[0.5px] border-gray-900">
            Modes
          </h1>
        </div>
        <LinkGroup activeLink={activeLink} setActiveLink={setActiveLink} />
        <div className="flex justify-center pb-5 ">
          <button
            onClick={() => {
              if (activeLink === "tournament") {
                setTournamentWaiting(true), setStep("first");
              } else {
                setIsWaiting(true), setStep("first");
              }
            }}
            className="text-2xl tracking-widest bg-[#393E46] p-5 m-6 md:m-10 lg:m-20 rounded-[30px] w-48 border text-center transition-all  hover:shadow-2xl shadow-golden hover:bg-slate-300 hover:text-black"
          >
            Play
          </button>
          {(isWaiting || tournamentWaiting) && step === "first" && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-25 flex justify-center items-center z-50 text-center pt-8">
              <div
                className="border w-auto m-2  lg:w-2/4 h-auto max-h-[80vh] overflow-y-auto text-center pt-8 border-white bg-blue_dark p-5"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <span className="tracking-widest text-xl">
                    Please choose your map
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 cursor-pointer mt-10">
                  {data.map((image) => (
                    <img
                      key={image.num}
                      src={image.cover}
                      alt={`MapNum ${image.num}`}
                      className={`transition-transform duration-300 ${
                        activeImg == image.num
                          ? " border-2 border-[#FFD369]"
                          : "hover:scale-105"
                      }`}
                      onClick={() => {
                        setMapNum(image.num);
                        setActiveImg(image.num);
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-center items-center">
                  <button
                    onClick={() => {
                      if (activeLink === "tournament") {
                        setTournamentWaiting(false);
                      } else {
                        setIsWaiting(false);
                      }
                    }}
                    className="text-xl tracking-widest bg-[#FFD369] p-2 m-4 rounded-[50px] w-48 border flex justify-center hover:shadow-2xl hover:bg-slate-300 text-black"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (activeLink === "tournament") {
                        sendGameMessage({
                          type: "tournament",
                          mapNum: mapNum,
                        });
                        setStep("second");
                      } else {
                        redirecting();
                      }
                    }}
                    className="text-xl tracking-widest bg-[#FFD369] p-2 m-4 rounded-[50px] w-48 border flex justify-center hover:shadow-2xl hover:bg-slate-300 text-black"
                  >
                    Play
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Tournament Mode Modal */}
          {tournamentWaiting &&
            step === "second" &&
            activeLink === "tournament" && (
              <div className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-25 flex justify-center items-center z-50">
                <div
                  className="border w-11/12 md:w-4/5 lg:w-3/4 max-h-[90vh] text-center border-white bg-blue_dark overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header Section */}
                  <div className="sticky top-0 z-20 bg-blue_dark pt-8 pb-4 px-4 shadow-lg">
                    <span className="tracking-widest text-xl block">
                      {gameState.waitingMsg}
                    </span>

                    {tournamentState.status === "waiting" && (
                      <div className="mt-4 text-lg">
                        <span className="tracking-widest">
                          {tournamentState.playersNeeded > 0
                            ? `Waiting for ${
                                tournamentState.playersNeeded
                              } more player${
                                tournamentState.playersNeeded !== 1 ? "s" : ""
                              }`
                            : "Tournament starting soon..."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tournament Bracket Section with padding for mobile */}
                  <div className="px-4 mt-16 md:mt-4 relative z-10">
                    <TournamentBracket
                      tournamentState={tournamentState}
                      gameState={gameState}
                      playerPic={playerPic}
                    />
                  </div>

                  {/* Players Section */}
                  <div className="px-4 mt-8 relative z-20 bg-blue_dark">
                    <div className="flex justify-around items-center">
                      <div>
                        <div
                          className="w-16 h-16 md:w-20 md:h-20 rounded-full border"
                          style={{ borderColor: "#FFD369" }}
                        >
                          <img
                            className="rounded-full w-full h-full object-cover"
                            src={playerPic}
                            alt="Player avatar"
                          />
                        </div>
                        <span className="tracking-widest text-sm md:text-base">
                          {playerName}
                        </span>
                      </div>

                      {(tournamentState.status === "pre_match" ||
                        tournamentState.status === "countdown") && (
                        <>
                          <span className="text-2xl md:text-4xl tracking-widest">
                            VS
                          </span>
                          <div>
                            <div
                              className="w-16 h-16 md:w-20 md:h-20 rounded-full border"
                              style={{ borderColor: "#FFD369" }}
                            >
                              <img
                                className="rounded-full w-full h-full object-cover"
                                src={gameState.playerTwoI}
                                alt="Opponent avatar"
                              />
                            </div>
                            <span className="tracking-widest text-sm md:text-base">
                              {gameState.playerTwoN}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Countdown Section */}
                  {tournamentState.status === "countdown" && (
                    <div className="pt-5 relative z-20 bg-blue_dark">
                      <span className="tracking-widest">
                        Match starting in <br />
                      </span>
                      {gameState.count}
                    </div>
                  )}

                  {/* Cancel Button Section */}
                  <div className="sticky bottom-0 z-20 bg-blue_dark py-4 shadow-lg">
                    <button
                      onClick={handleCancel}
                      className="text-xl tracking-widest bg-[#FFD369] p-2 rounded-[50px] w-48 border flex justify-center hover:shadow-2xl hover:bg-slate-300 text-black mx-auto"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default Maps;
