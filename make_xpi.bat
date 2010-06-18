::Set this to your extension's short name (i.e. no spaces, punctuation, etc.)
@set extname=tabkit
::If you want to call your xpi file something like <extname>0.5 then put everything after <extname> in version.
::You can just leave version blank of course
@set version=

::DON'T CHANGE ANYTHING BELOW THIS LINE

::Check mimimum necessary files are present (the script would work without some of them, but their absence suggests a problem with the extension)
@if not exist chrome.manifest goto nochromemanifest
@if not exist xpi goto noxpi
@if not exist xpi\install.rdf goto noinstallrdf
@if not exist xpi\chrome goto nochrome
@if not exist xpi\chrome\content goto nocontent

::Check required tools are available on the Path
for /F %%X in ("xcopy.exe")  DO IF "%%~$PATH:X"=="" goto noxcopy
for /F %%X in ("7z.exe")     DO IF "%%~$PATH:X"=="" goto no7z

::Cleanup things that might get in the way
@if exist temp rmdir /s /q temp
@if exist "%extname%%version%.xpi" del "%extname%%version%.xpi"

::Work with a temporary copy of the files
xcopy /E /I /Q /Y xpi temp
::Make the jar
cd temp\chrome
del content\consoleOverlay.xul
7z a -mx=0 -r -tzip "%extname%.jar" *
for /D %%d IN (*.*) DO rmdir /S /Q %%d
::Make the xpi
cd ..
@rem if exist ..\install.rdf copy /Y ..\install.rdf install.rdf
copy /Y ..\chrome.manifest chrome.manifest
7z a -mx=9 -r -tzip "..\%extname%%version%.xpi" *
cd ..
::Clean up
rmdir /s /q temp
@goto end

:nochromemanifest
@echo Error: file "chrome.manifest" not found
@goto pause

:noxpi
@echo Error: folder "xpi" not found in current directory
@goto pause

:noinstallrdf
@echo Error: file "xpi\install.rdf" not found
@goto pause

:nochrome
@echo Error: folder "xpi\chrome" not found
@goto pause

:nocontent
@echo Error: folder "xpi\chrome\content" not found
@goto pause

:noxcopy
@echo Error: required tool "xcopy.exe" not found on system path
@goto pause

:no7z
@echo Error: required tool "7z.exe" not found on system path
@goto pause

:pause
@pause

:end
