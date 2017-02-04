var config = {};

function Signature(bucket, password, save_key, content)
{
    var date = new Date();
    var content = CryptoJS.enc.Latin1.parse(content);
    var content_md5 = CryptoJS.MD5(content).toString(CryptoJS.enc.Hex);

    console.log("MD5:", content_md5)

    var policy = {};

    policy.bucket = bucket;
    policy["save-key"] = save_key;
    policy["content-md5"] = content_md5;
    policy["expiration"] = Math.floor(date.getTime()/1000 + 3600);
    policy["date"] = date.toGMTString();

    policy = JSON.stringify(policy);
    policy = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(policy));

    var password = CryptoJS.MD5(password).toString(CryptoJS.enc.Hex);

    var p = "POST" + "&/" +
            bucket + '&' +
            date.toGMTString() + '&' +
            policy + '&' + content_md5;

    console.log(password)
    console.log(p)

    var signature =  CryptoJS.HmacSHA1(p, password);
    signature = signature.toString(CryptoJS.enc.Base64);

    var res = {};
    res.signature = signature;
    res.policy = policy;
    return res;
}

function checkconfig()
{
    var l = localStorage;
    if (l.bucket)   config.bucket   = l.bucket;
    if (l.operator) config.operator = l.operator;
    if (l.password) config.password = l.password;
    if (l.prefix)   config.prefix   = l.prefix;

    if (config.bucket) return;

    $('div#config').show();
    $('div#config button').click(function(){
        config.bucket   = $("input#bucket").val();
        config.operator = $("input#operator").val();
        config.password = $("input#password").val();
        config.prefix   = $("input#prefix").val();

        l.bucket   = config.bucket;
        l.operator = config.operator;
        l.password = config.password;
        l.prefix   = config.prefix;
    });

}


(function(){
    checkconfig();

    var reader;
    var file;
    var imgReader = function( item ){
        var blob = item.getAsFile();
        file = blob;
        reader = new FileReader();

        reader.onload = function( e ){
            var img = new Image();
            img.id = 'Image';
            img.src = e.target.result;

            $("#images").html('');
            $("#images").append(img);

        };
        reader.readAsDataURL(blob);
        //reader.readAsBinaryString(blob);
    };

    // demo 程序将粘贴事件绑定到 document 上
    document.addEventListener("paste", function (e) {
        var cbd = e.clipboardData;
        var ua = window.navigator.userAgent;

        // 如果是 Safari 直接 return
        if ( !(e.clipboardData && e.clipboardData.items) ) {
            return;
        }

        // Mac平台下Chrome49版本以下 复制Finder中的文件的Bug Hack掉
        if(cbd.items && cbd.items.length === 2 && cbd.items[0].kind === "string" && cbd.items[1].kind === "file" &&
            cbd.types && cbd.types.length === 2 && cbd.types[0] === "text/plain" && cbd.types[1] === "Files" &&
            ua.match(/Macintosh/i) && Number(ua.match(/Chrome\/(\d{2})/i)[1]) < 49){
            return;
        }

        for(var i = 0; i < cbd.items.length; i++) {
            var item = cbd.items[i];
            if(item.kind == "file"){
                var blob = item.getAsFile();
                if (blob.size === 0) {
                    alert('请选择图片');
                    return;
                }
                imgReader( item );
                return;
                // blob 就是从剪切板获得的文件 可以进行上传或其他操作
            }
        }
        alert('请选择图片');
    }, false);

    $("#query").click(function (e) {
        var image = document.getElementById('Image');
        if(!image){
            alert('请选择图片');
            return;
        }


        var reader = new FileReader();

        reader.onload = function(){
            var res = Signature(config.bucket, config.password,
                config.prefix + '/{year}.{mon}.{day}.{hour}.{min}.{sec}.{random}',
                reader.result);

            var form = new FormData();

            form.append('file', file, filename='t');
            form.append('authorization', 'UPYUN ' + config.operator + ':' + res.signature);
            form.append('policy', res.policy);

            // TODO: 上传文件
            $.ajax({
                url: 'http://v0.api.upyun.com/' + config.bucket,
                data: form,
                type: 'POST',
                contentType: false,
                processData: false,
                success: function(response, statusText){
                    $('div#url').text('http://' + config.bucket + '.b0.upaiyun.com' + JSON.parse(response).url);
                }
            });
        }
        reader.readAsBinaryString(file);
    });
})();
