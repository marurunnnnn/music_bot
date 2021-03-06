import { CommandArgs, CommandInterface } from ".";
import { CommandMessage } from "../Component/CommandMessage"
import { log } from "../Util";

export default class Pause implements CommandInterface {
  name = "一時停止";
  alias = ["一旦停止", "停止", "pause", "stop"];
  description = "再生を一時停止します。";
  unlist = false;
  category = "player";
  async run(message:CommandMessage, options:CommandArgs){
    options.updateBoundChannel(message);
    // そもそも再生状態じゃないよ...
    if(!options.data[message.guild.id].Player.IsPlaying || options.data[message.guild.id].Player.IsPaused){
      message.reply("再生中ではありません").catch(e => log(e, "error"));
    }
    // 停止しま～す
    options.data[message.guild.id].Player.Pause();
    message.reply(":pause_button: 一時停止しました").catch(e => log(e, "error"));
  }
}