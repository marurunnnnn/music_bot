import Genius from "genius-lyrics";
import * as https from "https";
import { decode } from "html-entities";
import { DefaultAudioThumbnailURL } from "../definition";
import { DownloadText } from "./util";

export async function GetLyrics(keyword:string):Promise<songInfo>{
  const data = JSON.parse(await DownloadText("https://customsearch.googleapis.com/customsearch/v1?cx=89ebccacdc32461f2&key=" + process.env.CSE_KEY + "&q=" + encodeURIComponent(keyword))) as CSE_Result;
  const items = data.items?.filter(i => new URL(i.link).pathname.startsWith("/lyric/"));
  if(!items || items.length === 0) {
    // FallBack to Genius
    const client = new Genius.Client();
    try{
      const song = (await client.songs.search(keyword))[0];
      return {
        artist: song.artist.name,
        artwork: song.image,
        lyric: await song.lyrics(),
        title: song.title,
        url: song.url
      }
    }
    catch(e){
      throw "No lyric was found and failed to search in fallback way.";
    }
  }
  const url = items[0].link;
  var lyric = await DownloadWithoutRuby(url);
  var doc = "";
  [doc, lyric] = lyric.split("<div class=\"hiragana\" >");
  [lyric, ] = lyric.split("</div>");
  lyric = lyric.replace(/<span class="rt rt_hidden">.+?<\/span>/g, "");
  lyric = lyric.replace(/\n/g, "");
  lyric = lyric.replace(/<br \/>/g, "\n");
  lyric = lyric.replace(/[\r\n]{2}/g, "\n");
  lyric = lyric.replace(/<.+?>/g, "");
  const match = doc.match(/<meta name="description" content="(?<artist>.+?)が歌う(?<title>.+)の歌詞ページ.+です。.+">/);
  const artwork = doc.match(/<img src="(?<url>.+?)" alt=".+? 歌詞" \/>/).groups?.url;
  return {
    lyric: decode(lyric),
    artist: decode(match.groups.artist),
    title: decode(match.groups.title),
    artwork: artwork.startsWith("http") ? artwork : DefaultAudioThumbnailURL,
    url: url
  };
}

function DownloadWithoutRuby(url:string):Promise<string>{
  return new Promise((resolve,reject)=>{
    const durl = new URL(url);
    const req = https.request({
      protocol: durl.protocol,
      host: durl.host,
      path: durl.pathname,
      method: "GET",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "Cookie": "lyric_ruby=off;",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36"
      }
    }, res => {
      var data = "";
      res.on("data", (chunk)=>{
        data += chunk;
      });
      res.on("end", ()=>{
        resolve(data);
      });
      res.on("error", reject);
    }).on("error", reject);
    req.end();
  });
}

type songInfo = {
  lyric:string;
  artist:string;
  title:string;
  artwork:string;
  url:string;
}

interface CSE_Result {
  kind:              string;
  url:               URL;
  queries:           Queries;
  context:           Context;
  searchInformation: SearchInformation;
  items:             Item[];
}

interface Context {
  title: string;
}

interface Item {
  kind:             any;
  title:            string;
  htmlTitle:        string;
  link:             string;
  displayLink:      any;
  snippet:          string;
  htmlSnippet:      string;
  cacheId:          string;
  formattedUrl:     string;
  htmlFormattedUrl: string;
  pagemap:          Pagemap;
}

interface Pagemap {
  cse_thumbnail?: CSEThumbnail[];
  metatags:       { [key: string]: string }[];
  cse_image:      CSEImage[];
  listitem?:      Listitem[];
  Article?:       Article[];
}

interface Article {
  datePublished: string;
  image:         string;
  itemtype:      string;
  description:   string;
  dateModified:  string;
  headline:      string;
}

interface CSEImage {
  src: string;
}

interface CSEThumbnail {
  src:    string;
  width:  string;
  height: string;
}

interface Listitem {
  item:     string;
  name:     string;
  position: string;
}

interface Queries {
  request: Request[];
}

interface Request {
  title:          string;
  totalResults:   string;
  searchTerms:    string;
  count:          number;
  startIndex:     number;
  inputEncoding:  string;
  outputEncoding: string;
  safe:           string;
  cx:             string;
}

interface SearchInformation {
  searchTime:            number;
  formattedSearchTime:   string;
  totalResults:          string;
  formattedTotalResults: string;
}

interface URL {
  type:     string;
  template: string;
}
