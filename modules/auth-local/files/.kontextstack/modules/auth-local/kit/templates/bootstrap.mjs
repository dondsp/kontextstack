// Invoke from a private project CLI after connecting the reviewed durable store.
// Never import this function into an HTTP router or pass inputs via arguments.
import { stdin, stdout } from 'node:process';
async function hidden(prompt) {
  if(!stdin.isTTY || !stdout.isTTY)throw new Error('Private interactive terminal required');
  stdout.write(prompt);stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
  return new Promise((resolve,reject)=>{
    let value='';
    function finish(error){stdin.off('data',receive);stdin.setRawMode(false);stdin.pause();stdout.write('\n');error?reject(error):resolve(value);}
    function receive(chunk){for(const char of chunk){if(char==='\u0003'){finish(new Error('Cancelled'));return;}if(char==='\r'||char==='\n'){finish();return;}if(char==='\u007f'){value=value.slice(0,-1);continue;}if(char>=' '&&value.length<1024)value+=char;}}
    stdin.on('data',receive);
  });
}
export async function bootstrapInteractive(auth) {
  const approval=await hidden('Type create-first-administrator to authorize (hidden): ');
  const email=await hidden('Administrator email (hidden): ');
  const password=await hidden('Administrator password (hidden): ');
  const confirmation=await hidden('Repeat password (hidden): ');
  if(password!==confirmation)throw new Error('Confirmation mismatch');
  await auth.bootstrap({email,password},approval);
  stdout.write('Administrator bootstrap completed. Verify sign-in privately.\n');
}
