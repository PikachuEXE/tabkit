#!/usr/bin/python
import os, fnmatch, itertools, re

# From http://code.activestate.com/recipes/499305/
def locate(pattern, root=os.curdir):
	'''Locate all files matching supplied filename pattern in and below
	supplied root directory.'''
	for path, dirs, files in os.walk(os.path.abspath(root)):
		for filename in fnmatch.filter(files, pattern):
			yield os.path.join(path, filename)

clike = itertools.chain(locate("*.js", "temp"), locate("*.css", "temp")) # chain concatenates generators
xml = itertools.chain(locate("*.xul", "temp"), locate("*.xml", "temp"))

csub = [] # Search,replace tuples for clike files

'''Prepare /*!!**/ ... /**!!*/ for replacement (let later code deal with whitespace)'''
csub.append((r'/[*]!![*][*]/ .*? /[*][*]!![*]/', '/*!! */'))

'''Replace /*!! ... */, and some surrounding whitespace'''
# Decomposition of the first regex (to help understand them all):
#   ^ (?=[ \t\r]* \n)    = lookahead: make sure we are about to match a blank line
#   (?:                  = start group
#       (?:[ \t\r]* \n)? = optional blank line (compulsory for the first instance thanks to earlier lookahead)
#       [ \t]*           = whitespace
#       /[*]!!           = /*!!
#       (?:(?![*]/).)*   = ...
#       [*]/             = */
#       [ \t\r]*         = whitespace
#       \n?              = optional linebreak (compulsory for the last instance thanks to later lookbehind)
#   )+                   = end group; repeat one or more times
#   (?<=\n)              = lookbehind: make sure previous character was a linebreak
#   ([ \t\r]* \n)        = captured blank line
csub.append((r'^ (?=[ \t\r]* \n) (?: (?:[ \t\r]* \n)? [ \t]* /[*]!! (?:(?![*]/).)* [*]/ [ \t\r]* \n? )+ (?<=\n) ([ \t\r]* \n)', r'\1')); # Match: ^ blank \n comment \n blank
#csub.append((r'^ ([ \t\r]* \n) (?: [ \t]* /[*]!! (?:(?![*]/).)* [*]/ [ \t\r]* \n )+ [ \t\r]* \n', r'\1')); # Old version of above (incorrect for blank \n comment \n blank \n comment \n blank case)
csub.append((r'^ [ \t]* /[*]!! (?:(?![*]/).)* [*]/ [ \t\r]* \n', '')); # Match: ^ comment \n
csub.append((r'/[*]!! (?:(?![*]/).)* [*]/', '')); # Match: comment

'''Replace //!! ..., and some surrounding whitespace'''
csub.append((r'^ (?=[ \t\r]* \n) (?: (?:[ \t\r]* \n)? [ \t]* //!! [^\n]* \n )+ ([ \t\r]* \n)', r'\1'));
csub.append((r'^ [ \t]* //!! [^\n]* \n', ''));
csub.append((r'[ \t]* //!! [^\r\n]*', ''));

xsub = [] # Search,replace tuples for xml files

'''Prepare <!--!!*--> ... <!--*!!--> for replacement (let later code deal with whitespace)'''
xsub.append((r'<!--!![*]--> .*? <!--[*]!!-->', '<!--!! -->'));

'''Replace <!--!! ... -->, and some surrounding whitespace'''
xsub.append((r'^ (?=[ \t\r]* \n) (?: (?:[ \t\r]* \n)? [ \t]* <!--!! (?:(?!-->).)* --> [ \t\r]* \n? )+ (?<=\n) ([ \t\r]* \n)', r'\1'));
xsub.append((r'^ [ \t]* <!--!! (?:(?!-->).)* --> [ \t\r]* \n', ''));
xsub.append((r'<!--!! (?:(?!-->).)* -->', ''));

for files, replacements in [(clike, csub), (xml, xsub)]:
	replacements = [(re.compile(s, re.MULTILINE|re.DOTALL|re.VERBOSE), r) for s, r in replacements]
	
	for fpath in files:
		file = open(fpath, 'r')
		text = orig = file.read()
		file.close()
		
		for s, r in replacements:
			text = s.sub(r, text)
		
		if text != orig:
			print("Filtering {0}".format(fpath))
			file = open(fpath, 'w')
			file.write(text)
			file.close()
