import * as os from "os";
import * as https from "https";
import * as miniget from "miniget";
import type { Client, GuildMember, Message, TextChannel } from "discord.js";
import { PassThrough, Readable } from "stream";
export { log, logStore, timer } from "./logUtil";
export * as config from "./configUtil";

/**
 * 合計時間(秒)からゼロ補完された分および秒を計算します。
 * @param _t 合計時間(秒)
 * @returns [ゼロ補完された分,ゼロ補完された秒]
 */
export function CalcMinSec(_t:number){
  const sec = _t % 60;
  const min = (_t - sec) / 60;
  return [AddZero(min.toString(), 2), AddZero(sec.toString(), 2)];
}

/**
 * 合計時間(秒)から時間、ゼロ補完された分および秒を計算します。
 * @param seconds 合計時間(秒)
 * @returns [時間, ゼロ補完された分, ゼロ補完された秒]
 */
export function CalcHourMinSec(seconds:number){
  const sec = seconds % 60;
  const min = (seconds - sec) / 60 % 60;
  const hor = ((seconds - sec) / 60 - min) / 60;
  return [hor.toString(), AddZero(min.toString(), 2), AddZero(sec.toString(), 2)];
}

/**
 * 指定された文字列を指定された桁数になるまでゼロ補完します。
 * @param str 補完する文字列
 * @param length 補完後の長さ
 * @returns 保管された文字列
 */
export function AddZero(str:string, length:number){
  if(str.length >= length) return str;
  while(str.length < length){
    str = "0" + str;
  }
  return str;
}

// Returns hour, min, sec and millisec from total millisec
/**
 * 合計時間(ミリ秒)から時間,分,秒,ミリ秒を計算します。
 * @param date 合計時間(ミリ秒)
 * @returns [時間,分,秒,ミリ秒]
 */
export function CalcTime(date:number):number[]{
  const millisec = date % 1000;
  let ato = (date - millisec) / 1000;
  const sec = ato % 60;
  ato = (ato - sec) / 60;
  const min = ato % 60;
  const hour = (ato - min) / 60;
  return [hour, min, sec, millisec];
}

/**
 * メモリ使用情報
 */
type MemoryUsageInfo = {free:number,total:number,used:number,usage:number};

/**
 * メモリ使用情報を取得します
 * @returns メモリ使用情報
 */
export function GetMemInfo():MemoryUsageInfo{
  let memory = {} as MemoryUsageInfo;
  memory.free = GetMBytes(os.freemem());
  memory.total = GetMBytes(os.totalmem());
  memory.used = memory.total - memory.free;
  memory.usage = GetPercentage(memory.used, memory.total);
  return memory;
}

/**
 * 指定されたバイト数をメガバイトに変換します
 * @param bytes 指定されたバイト
 * @returns 返還後のメガバイト数
 */
export function GetMBytes(bytes:number) {
  return Math.round(bytes / 1024/*KB*/ / 1024/*MB*/ * 100) / 100;
}

/**
 * パーセンテージを計算します
 * @param part 計算対象の量
 * @param total 合計量
 * @returns 計算後のパーセンテージ
 */
export function GetPercentage(part:number, total:number){
  return Math.round(part / total * 100 * 100) / 100;
}

/**
 * 文字列をBase64エンコードします
 * @param txt エンコードする文字列
 * @returns Base64エンコードされた文字列
 */
export function btoa(txt:string){
  return Buffer.from(txt).toString("base64");
}

/**
 * 指定されたURLからテキストデータをダウンロードします
 * @param url URL
 * @returns ダウンロードされたテキストデータ
 */
export function DownloadText(url:string, headers?:{[key:string]:string}, requestBody?:any):Promise<string>{
  return new Promise((resolve,reject)=>{
    const durl = new URL(url);
    const req = https.request({
      protocol: durl.protocol,
      host: durl.host,
      path: durl.pathname + durl.search,
      method: requestBody ? "POST" : "GET",
      headers: headers ?? undefined
    }, res => {
      let data = "";
      res.on("data", chunk =>{
        data += chunk;
      });
      res.on("end", ()=>{
        resolve(data);
      });
      res.on("error", reject);
    }).on("error", reject);
    req.end(requestBody ?? undefined);
  });
}

/**
 * ローオーディオファイルのURLであるかどうかをURLの末尾の拡張子から判断します
 * @param str 検査対象のURL
 * @returns ローオーディオファイルのURLであるならばtrue、それ以外の場合にはfalse
 */
export function isAvailableRawAudioURL(str:string){
  const exts = [".mp3",".wav",".wma",".mov",".mp4"];
  return exts.filter(ext => str.endsWith(ext)).length > 0;
}

export function isAvailableRawVideoURL(str:string){
  const exts = [".mov",".mp4"];
  return exts.filter(ext => str.endsWith(ext)).length > 0;
}

/**
 * おそらくDiscord側のAPIの仕様変更により、discord.jsのMessage.suppressEmbeds()が動作しなくなったため代替としてREST APIを叩きます
 * @param msg suppressEmbedsしたいメッセージ
 * @param client supressEmbedsするクライアント
 * @param token ボットのトークン
 * @returns supressEmbedsされたメッセージ
 * @deprecated アップデートにより非推奨
 */
export function suppressMessageEmbeds(msg:Message, client?:Client):Promise<Message>{
    return msg.suppressEmbeds(true);
}

/**
 * 指定されたURLからReadable Streamを生成します
 * @param url URL
 * @returns Readableストリーム
 */
export function DownloadAsReadable(url:string):Readable{
  const stream = InitPassThrough();
  const req = miniget.default(url, {
    maxReconnects: 6,
    maxRetries: 3,
    backoff: { inc: 500, max: 10000 },
  });
  req.on("error", (e)=>{
    stream.emit("error",e);
  }).pipe(stream);
  return stream;
}

/**
 * 空のPassThroughを生成します
 * @returns PassThrough
 */
export function InitPassThrough():PassThrough{
  const stream = new PassThrough({
    highWaterMark: 1024 * 512
  });
  stream._destroy = () => { stream.destroyed = true };
  return stream;
}

/**
 * 文字列を正規化します
 */
export function NormalizeText(rawText:string){
  let result = rawText;
  ([
    {key: /０/g, value: "0"},
    {key: /１/g, value: "1"},
    {key: /２/g, value: "2"},
    {key: /３/g, value: "3"},
    {key: /４/g, value: "4"},
    {key: /５/g, value: "5"},
    {key: /６/g, value: "6"},
    {key: /７/g, value: "7"},
    {key: /８/g, value: "8"},
    {key: /９/g, value: "9"},
    {key: /　/g, value: " "},
  ] as {key:RegExp, value:string}[]).forEach(reg => {
    result = result.replace(reg.key, reg.value);
  });
  return result;
}


/**
 * 与えられたテキストチャンネルでメンバーが送信可能かどうかを判断します。
 * @param channel 検査対象のテキストチャンネル
 * @param user ユーザー
 * @returns 可能であればtrue、それ以外であればfalse
 */
export async function CheckSendable(channel:TextChannel, user:GuildMember){
  try{
    const permissions = ((await channel.fetch()) as TextChannel).permissionsFor(user);
    return permissions.has("SEND_MESSAGES") 
      && permissions.has("EMBED_LINKS")
      && permissions.has("MANAGE_MESSAGES")
      && permissions.has("ATTACH_FILES")
      ;
  }
  catch{
    return false;
  }
}

/**
 * オブジェクトを可能な限り文字列化します
 * @param obj 対象のオブジェクト
 * @returns 文字列。JSON、またはその他の文字列、および空の文字列の場合があります
 */
export function StringifyObject(obj:any){
  try{
    return JSON.stringify(obj);
  }
  catch{
    try{
      return Object.prototype.toString.call(obj);
    }
    catch{
      return "";
    }
  }
}